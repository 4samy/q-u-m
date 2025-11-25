(function () {
    const base = "https://cdn.jsdelivr.net/gh/4samy/q-u-m@4d1e42c/src/";

    const files = [
        "core/dataFetcher.js",
        "core/articleModel.js",
        "core/scoringEngine.js",

        "analyzers/structureAnalyzer.js",
        "analyzers/grammarAnalyzer.js",
        "analyzers/languageAnalyzer.js",
        "analyzers/mediaAnalyzer.js",
        "analyzers/linkAnalyzer.js",
        "analyzers/referenceAnalyzer.js",
        "analyzers/revisionAnalyzer.js",
        "analyzers/maintenanceAnalyzer.js",
        "analyzers/wikidataIntegrationAnalyzer.js",

        "ui/panelRenderer.js",

        "main.js"
    ];

    function loadSequentially(i) {
        if (i >= files.length) return;

        const url = base + files[i] + "?v=" + Date.now();
        console.log("[QUM] Loading:", url);

        mw.loader.load(url);

        setTimeout(() => loadSequentially(i + 1), 150);
    }

    mw.loader.using(['mediawiki.util', 'mediawiki.api']).then(() => {
        loadSequentially(0);
    });
})();
