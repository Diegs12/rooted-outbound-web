/* Invisible analytics. */
(function () {
  var KEY = "phc_scsJ6raLToZQB2TczBHCZk3Qz33MToVcenDFcpl3Hfh";
  var HOST = "https://us.i.posthog.com";
  var params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  var internal = false;
  try {
    if (params && params.get("vv_internal") === "1") {
      internal = true;
      sessionStorage.setItem("vv_ph_internal", "1");
      params.delete("vv_internal");
      var clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
      window.history.replaceState({}, "", clean);
    } else if (sessionStorage.getItem("vv_ph_internal") === "1") {
      internal = true;
    }
  } catch (e) {}

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;void 0!==a?u=e[a]=[]:a="posthog";u.people=u.people||[];u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"};o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" ");for(n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    enable_heatmaps: true,
    session_recording: { maskAllInputs: true },
    disable_session_recording: (function () {
      try { return window.location.pathname.indexOf("/next-season-sports-activation-blueprint") !== 0; }
      catch (e) { return true; }
    })(),

    persistence: "localStorage+cookie",
    loaded: function (ph) {
      ph.register({ site: "rooted_outbound" });
      if (internal) {
        ph.register({ internal_traffic: true, woz_verify: true });
        ph.capture("pitch_site_verify", { woz_verify: true, path: location.pathname });
      }
      setupScrollDepth(ph);
      setupSections(ph);
      setupVideos(ph);
    }
  });

  function setupScrollDepth(ph) {
    var marks = [25, 50, 75, 100];
    var sent = {};
    function measure() {
      var el = document.documentElement;
      var body = document.body;
      var scrollTop = window.scrollY || el.scrollTop || 0;
      var height = Math.max(el.scrollHeight, body ? body.scrollHeight : 0) - window.innerHeight;
      var pct = height <= 0 ? 100 : Math.min(100, Math.round((scrollTop / height) * 100));
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (!sent[m] && pct >= m) {
          sent[m] = true;
          ph.capture("scroll_depth", { percent: m, path: location.pathname });
        }
      }
    }
    window.addEventListener("scroll", measure, { passive: true });
    measure();
  }

  function sectionName(el) {
    if (el.id) return el.id;
    return (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  function setupSections(ph) {
    if (!("IntersectionObserver" in window)) return;
    var seen = {};
    var entered = {};
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var name = sectionName(entry.target);
        if (!name) continue;
        if (entry.isIntersecting) {
          if (!entered[name]) entered[name] = Date.now();
          if (!seen[name]) {
            seen[name] = true;
            ph.capture("section_view", {
              section: name,
              heading: (entry.target.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
              path: location.pathname
            });
          }
        } else if (entered[name]) {
          var started = entered[name];
          delete entered[name];
          ph.capture("section_time", {
            section: name,
            duration_ms: Date.now() - started,
            path: location.pathname
          });
        }
      }
    }, { threshold: 0.25 });

    var nodes = document.querySelectorAll("main h1, main h2, main section[id], main [id], h1, h2, section[id]");
    for (var j = 0; j < nodes.length; j++) {
      var el = nodes[j];
      if (el.id === "main" || el.id === "root") continue;
      io.observe(el);
    }

    window.addEventListener("pagehide", function () {
      var now = Date.now();
      for (var name in entered) {
        if (!Object.prototype.hasOwnProperty.call(entered, name)) continue;
        ph.capture("section_time", {
          section: name,
          duration_ms: now - entered[name],
          path: location.pathname
        });
      }
      entered = {};
    });
  }

  function videoLabel(v) {
    var wrap = v.closest("figure, .video, .player, article, section, li, div");
    if (wrap) {
      var t = wrap.querySelector("h2, h3, figcaption, [data-block-id*='title']");
      if (t) {
        var label = (t.textContent || "").replace(/\s+/g, " ").trim();
        if (label) return label.slice(0, 120);
      }
    }
    var src = v.currentSrc || v.getAttribute("src") || "";
    var parts = src.split("/");
    return parts[parts.length - 1] || "video";
  }

  function setupVideos(ph) {
    var videos = document.querySelectorAll("video");
    for (var i = 0; i < videos.length; i++) {
      (function (v) {
        v.addEventListener("play", function () {
          ph.capture("video_play", { video: videoLabel(v), path: location.pathname });
        });
        v.addEventListener("pause", function () {
          ph.capture("video_pause", {
            video: videoLabel(v),
            current_time: Math.round(v.currentTime || 0),
            path: location.pathname
          });
        });
        v.addEventListener("ended", function () {
          ph.capture("video_complete", { video: videoLabel(v), path: location.pathname });
        });
      })(videos[i]);
    }
  }
})();
