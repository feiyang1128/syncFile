# syncFile

Run `powershell -ExecutionPolicy Bypass -File .\scripts\sync-from-site.ps1` to sync files defined in `scripts/sync-from-site.json`.

Each entry in `scripts/sync-from-site.json` maps one local file to one remote URL:

```json
{
  "files": [
    {
      "path": "tvbox.json",
      "url": "https://example.com/tvbox.json"
    }
  ]
}
```

Add more entries to let each file use its own remote source.
