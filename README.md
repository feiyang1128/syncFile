# syncFile

使用下面的命令，可以同步 `scripts/sync-from-site.json` 中配置的文件：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-from-site.ps1
```

`scripts/sync-from-site.json` 中的每一项都表示“本地文件路径”对应一个“远端 URL”，示例：

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

如果需要同步更多文件，继续往 `files` 数组里追加即可。

APK 同步配置示例：

```json
{
  "path": "Apps/example.apk",
  "url": "https://example.com/download/example.apk"
}
```

像 `.apk` 这样的二进制文件，同步后不会写入“更新时间”注释，文件内容会保持原样。

工作流会自动判断同步下来的文件是走 Git 提交，还是走 GitHub Release 资产：

- `.apk` 文件固定发布到 `synced-assets-latest` release
- 任何大于等于 `104857600` 字节（`100 MiB`）的同步文件，也会发布到这个 release
- 被 release 管理的文件会在同一次 workflow 里上传，并自动排除出 Git 提交，不进入仓库历史
