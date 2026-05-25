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

APK sync entry template:

```json
{
  "path": "Apps/example.apk",
  "url": "https://example.com/download/example.apk"
}
```

Binary files such as `.apk` are synced without the timestamp comment rewrite, so their contents stay intact.

The workflow automatically decides whether a synced file should go into GitHub release assets instead of Git history:

- `.apk` files always go to the fixed `synced-assets-latest` release.
- Any synced file at or above `104857600` bytes (`100 MiB`) also goes to that release.
- Release-managed files are uploaded to the fixed release and excluded from the Git commit in the same workflow run.
