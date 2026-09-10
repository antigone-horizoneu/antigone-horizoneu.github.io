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

## Test National — installed, with one important limit

All eighteen Klim trial styles are in place as WOFF2, mapped across weights
100 to 900 with matching italics. Thin is 100, Light 200, Book 300, Regular
400, Medium 500, Semibold 600, Bold 700, Extrabold 800, Black 900. Medium
carries most of the page; Bold sets the wordmark and the large ANTIGONE.

**The trial files contain 68 characters.** Only these:

    A-Z   a-z   0-9   space   comma   hyphen   period

No accented letters, no apostrophes, colons, ampersands, parentheses, em
dashes, curly quotes or currency signs. Any of those in a heading falls back
to Helvetica Neue for that one character, which shows as a slight mismatch
mid-word. It matters most for people's names: a heading reading Müller will
render the umlaut in the fallback face.

Nothing breaks, and body text is unaffected because Otto carries a full
character set. But keep headings to plain letters until the full family is
licensed, and expect to revisit this when the People page fills up.

## Licensing

Both are **trial** licences. These normally cover mock-ups and internal
presentation, not a live public website. Check each licence before the site
goes public and buy the web licences if it applies. Nothing breaks if you pull
the files out: the site falls back to system faces and still holds together.
