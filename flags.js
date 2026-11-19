/* =========================================================
   flags.js  -  shared by every page that shows country flags.

   The settings are made in flags-admin.html and stored next to the other
   data as  flags-config.json:
     {
       countries: { "france": { name: "France", flag: "images/flags/fr.png", heart: "images/hearts/france.png" } },
       pages:     { results: "flag", voting: "heart", ... }
     }

   USE IT IN A PAGE (after status-config.js):
     <script src="status-config.js"></script>
     <script src="flags.js"></script>

     // image address candidates for one country, best first
     FlagPicker.urls("France", "voting")            // -> ["image/hearts/france.png", ...]
     FlagPicker.kind("France", "flag")              // only the flag candidates (assigned file, then folders)
     FlagPicker.entry("France")                     // -> { name, flag, heart } as assigned in the admin page
     FlagPicker.mode("voting")                      // -> "heart" or "flag"
     FlagPicker.ready.then(() => redraw());         // settings arrived from the database
     FlagPicker.onChange(() => redraw());           // called every time they arrive

   Put the image in an <img> and, on error, try the next address in the list
   (results.html does exactly this).
========================================================= */

(function () {
  "use strict";

  var CFG = window.STATUS_CONFIG || {};
  var configured = CFG.dbUrl && CFG.apiKey && !/YOUR-/.test(CFG.dbUrl + CFG.apiKey);
  var BASE = (CFG.dbUrl || "").replace(/\/$/, "");
  var CONFIG_URL = BASE + "/flags-config.json";
  var CACHE_KEY = "flagsConfigCache";

  // Folders searched when no address was assigned (file name = country name, lowercase with dashes)
  var FLAG_FOLDER = "images/flags/";
  var HEART_FOLDERS = ["image/hearts/", "images/hearts/"];   // same folders voting.html already uses
  var EXTS = [".png", ".svg", ".webp", ".jpg", ".jpeg"];

  var config = { countries: {}, pages: {} };
  var listeners = [];
  var version = 0;      // goes up every time the settings change (pages use it to forget remembered images)

  function slug(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  // Keep only what is valid, so a broken save can never break a page.
  function normalize(data) {
    var out = { countries: {}, pages: {} };
    var countries = asObject(data && data.countries);
    var pages = asObject(data && data.pages);

    Object.keys(countries).forEach(function (key) {
      var item = asObject(countries[key]);
      var entry = {};
      if (typeof item.name === "string" && item.name.trim()) entry.name = item.name.trim();
      if (typeof item.flag === "string" && item.flag.trim()) entry.flag = item.flag.trim();
      if (typeof item.heart === "string" && item.heart.trim()) entry.heart = item.heart.trim();
      if (entry.flag || entry.heart) out.countries[key] = entry;
    });

    Object.keys(pages).forEach(function (key) {
      if (pages[key] === "heart" || pages[key] === "flag") out.pages[key] = pages[key];
    });

    return out;
  }

  function use(data) {
    config = normalize(data);
    version += 1;
  }

  function notify() {
    listeners.slice().forEach(function (fn) {
      try { fn(config); } catch (error) { /* a page's own problem */ }
    });
  }

  try {
    use(JSON.parse(localStorage.getItem(CACHE_KEY) || "null"));
  } catch (error) {
    use(null);
  }

  var ready = !configured ? Promise.resolve() : fetch(CONFIG_URL, { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      use(data);
      try {
        if (data) localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        else localStorage.removeItem(CACHE_KEY);
      } catch (error) { /* not cached */ }
      notify();
    })
    .catch(function () { /* keep the cached settings */ });

  // "heart" or "flag": what a page shows (a page nobody set up shows flags).
  function mode(page) {
    return config.pages[page] === "heart" ? "heart" : "flag";
  }

  // What was assigned to one country in the admin page: { name?, flag?, heart? }
  function entryOf(country) {
    return config.countries[slug(country)] || {};
  }

  function asList(value, fallback) {
    if (value === undefined) return fallback;
    return Array.isArray(value) ? value : (value ? [value] : []);
  }

  // Addresses for ONE kind of image ("flag" or "heart"): the assigned file first, then the default folders.
  // options (all optional): { flagFolder, heartFolder (text or list), exts }
  function kindUrls(country, kind, options) {
    var opts = options || {};
    var key = slug(country);
    var exts = opts.exts || EXTS;
    var folders = kind === "heart"
      ? asList(opts.heartFolder, HEART_FOLDERS)
      : asList(opts.flagFolder, [FLAG_FOLDER]);
    var out = [];

    function add(url) { if (url && out.indexOf(url) < 0) out.push(url); }

    add(entryOf(country)[kind]);
    if (key) folders.forEach(function (dir) { exts.forEach(function (ext) { add(dir + key + ext); }); });

    return out;
  }

  // Image addresses for one country on one page, best first (the other kind is the fallback).
  // options (all optional): { flagFolder, heartFolder, exts, cdn }  cdn = a last-resort flag address.
  function urls(country, page, options) {
    var opts = options || {};
    var out = [];

    function addAll(list) { list.forEach(function (url) { if (out.indexOf(url) < 0) out.push(url); }); }

    if (mode(page) === "heart") {
      addAll(kindUrls(country, "heart", opts));
      addAll(kindUrls(country, "flag", opts));
      if (opts.cdn) addAll([opts.cdn]);
    } else {
      addAll(kindUrls(country, "flag", opts));
      if (opts.cdn) addAll([opts.cdn]);
      addAll(kindUrls(country, "heart", opts));
    }

    return out;
  }

  window.FlagPicker = {
    ready: ready,
    configured: Boolean(configured),
    configUrl: CONFIG_URL,
    base: BASE,
    cacheKey: CACHE_KEY,
    flagFolder: FLAG_FOLDER,
    heartFolders: HEART_FOLDERS,
    exts: EXTS,
    version: function () { return version; },
    slug: slug,
    normalize: normalize,
    mode: mode,
    urls: urls,
    kind: kindUrls,
    entry: entryOf,
    config: function () { return config; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
