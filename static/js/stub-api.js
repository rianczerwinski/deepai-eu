/**
 * Client-side API interceptor for EU-DeepAI stub deployment.
 *
 * Intercepts all fetch() calls to app_base_url and returns canned responses,
 * eliminating the need for a backend server. Must be loaded BEFORE any other
 * scripts that use fetch().
 *
 * Chat endpoint streams text word-by-word via a synthetic ReadableStream,
 * matching the real DeepAI streaming format.
 */
(function () {
  "use strict";

  var API_BASE = "http://localhost:8000";
  var _origFetch = window.fetch;

  // ── Canned responses ──

  var COMING_SOON_CHAT =
    "**API access coming soon!**\n\n" +
    "EU-compliant AI endpoints are under development. " +
    "Full chat, image generation, and other AI features will be available here shortly.\n\n" +
    "In the meantime, visit the documentation for API integration details.";

  var DUMMY_AD = {
    selection: [
      {
        adHeadline: "DeepAI Pro",
        adText:
          "Unlimited AI generation across all models with priority access and no ads.",
        adName: "DeepAI",
        adUrl: "pricing.html",
        adCTA: "Explore Pro Plans",
      },
    ],
  };

  var GEO_RESPONSE = {
    country_code2: "US",
    country_name: "United States",
    city: "San Francisco",
    state_prov: "California",
  };

  // ── Helpers ──

  function jsonResponse(data, status) {
    status = status || 200;
    return new Response(JSON.stringify(data), {
      status: status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function emptyOk() {
    return jsonResponse({});
  }

  function streamingResponse(text) {
    var words = text.split(" ");
    var i = 0;
    var encoder = new TextEncoder();

    var stream = new ReadableStream({
      pull: function (controller) {
        return new Promise(function (resolve) {
          if (i >= words.length) {
            controller.close();
            resolve();
            return;
          }
          var chunk = words[i] + (i < words.length - 1 ? " " : "");
          controller.enqueue(encoder.encode(chunk));
          i++;
          setTimeout(resolve, 25);
        });
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ── Route matching ──

  function getPath(url) {
    try {
      return new URL(url).pathname;
    } catch (e) {
      return url;
    }
  }

  function handleGet(path) {
    if (path === "/daily-time-sync/user/")
      return jsonResponse({ detail: "Not authenticated" }, 401);
    if (path === "/get_geo_ip") return jsonResponse(GEO_RESPONSE);
    if (path === "/get_my_stripe_subscription_checkout_link")
      return jsonResponse({ link: "" }, 401);
    if (path === "/get_my_stripe_card_update_link")
      return jsonResponse({ link: "" }, 401);
    if (path === "/get_my_hearted_object_ids") return jsonResponse([]);
    if (path === "/fetch_user_handle")
      return jsonResponse({ author_url_handle: "" }, 401);
    if (path.indexOf("/get_usage_summary") === 0)
      return jsonResponse({ usage: [] });
    if (path === "/check_characters_enabled")
      return jsonResponse({ enabled: false });
    if (path === "/get_author_obj_img_url")
      return new Response("", { status: 404 });
    return emptyOk();
  }

  function handlePost(path) {
    // Chat
    if (path === "/hacking_is_a_serious_crime")
      return streamingResponse(COMING_SOON_CHAT);

    // Image / model API
    if (path.indexOf("/api/") === 0) {
      var modelId = path.replace("/api/", "") || "unknown";
      return jsonResponse({
        err:
          "Coming soon \u2014 the " +
          modelId +
          " endpoint is not yet available on the EU instance.",
      });
    }

    // Ad proxy
    if (path === "/prorata-ad-proxy") return jsonResponse(DUMMY_AD);

    // Analytics / heartbeat
    if (path === "/log_stat" || path === "/favicon.ico") return emptyOk();

    // Auth
    if (path === "/daily-time-sync/login/")
      return jsonResponse(
        { detail: "Login is not available on this instance." },
        400
      );
    if (path === "/daily-time-sync/registration/")
      return jsonResponse(
        { detail: "Registration is not available on this instance." },
        400
      );
    if (path === "/daily-time-sync/logout/")
      return jsonResponse({ detail: "ok" });

    // Misc
    if (path === "/add_remove_heart") return emptyOk();
    if (path === "/get_user_login_type")
      return jsonResponse({ user_exists: false });
    if (path === "/password_reset_trigger") return emptyOk();
    if (path === "/save_custom_signup_data") return emptyOk();
    if (path === "/update_auto_top_up_settings")
      return jsonResponse({ error: "Not available" }, 400);
    if (path.indexOf("/dashboard/") === 0)
      return jsonResponse({ detail: "Not available" }, 401);
    if (path.indexOf("/gallery-item-download/") === 0)
      return jsonResponse({ detail: "Not available" }, 401);

    return emptyOk();
  }

  // ── Fetch override ──

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

    // Only intercept requests to the API base
    if (url.indexOf(API_BASE) !== 0) {
      return _origFetch.apply(this, arguments);
    }

    var path = getPath(url);
    var method = (init && init.method ? init.method : "GET").toUpperCase();

    if (method === "OPTIONS") {
      return Promise.resolve(
        new Response("", {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, api-key",
          },
        })
      );
    }

    var response;
    if (method === "POST") {
      response = handlePost(path);
    } else {
      response = handleGet(path);
    }

    return Promise.resolve(response);
  };
})();
