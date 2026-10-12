# Rungnapa résumé website

Multilingual résumé and teaching portfolio in English, Thai, and Traditional Chinese, with scroll reveals, atmospheric fog, and a glass airplane scene.

## Local preview

From the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No build or package installation is required.

## Structure

- `dist/`: the complete static website and assets.
- `dist/th/` and `dist/zh-hant/`: language routes.
- `dist/vendor/`: bundled Motion and Three.js, with their licenses.

This snapshot includes the published scroll reveals. The discussed camera arc, stronger heading reveals, and copy refinements have not yet been implemented.
