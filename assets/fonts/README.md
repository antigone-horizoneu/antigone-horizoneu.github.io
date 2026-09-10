# Fonts

## Otto — installed

**ABC Otto Trial** (Dinamo) is in place, converted to WOFF2. Eight styles:
Light, Regular, Medium and Bold, each with a matching italic. The stylesheet
maps them to weights 300, 400, 500 and 700.

    Otto-Light.woff2        Otto-LightItalic.woff2
    Otto-Regular.woff2      Otto-Italic.woff2
    Otto-Medium.woff2       Otto-MediumItalic.woff2
    Otto-Bold.woff2         Otto-BoldItalic.woff2

Regenerate them from the OTFs with:

    pip install fonttools brotli
    python3 - <<'PY'
    from fontTools.ttLib import TTFont
    f = TTFont("ABCOttoTrial-Regular.otf"); f.flavor = "woff2"
    f.save("Otto-Regular.woff2")
    PY

## Test National — still needed

Headings fall back to Helvetica until these arrive. Rename your Klim trial
downloads to match, convert them the same way, and drop them here:

    National-Regular.woff2  National-Regular.woff
    National-Medium.woff2   National-Medium.woff
    National-Bold.woff2     National-Bold.woff

Medium carries most of the page. Bold is used for the wordmark and the large
ANTIGONE on the home page.

## Licensing

Both are **trial** licences. These normally cover mock-ups and internal
presentation, not a live public website. Check each licence before the site
goes public and buy the web licences if it applies. Nothing breaks if you pull
the files out: the site falls back to system faces and still holds together.
