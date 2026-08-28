# syncFile

自用同步仓库，用来集中维护 TV 配置、Mihomo 规则配置、远端规则列表和部分发布资产。

## 目录

- `TV/`：TVBox、MoonTV 等配置文件。
- `Mihomo/file/`：Mihomo 配置、规则源、重命名脚本和兼容规则。
- `Mihomo/file/list/`：订阅转换使用的 Clash list 规则集。
- `scripts/`：从远端 URL 同步文件的脚本和清单。
- `app/`：手动纳入仓库的小体积 APK。

## 文件同步

使用下面的命令，可以同步 `scripts/sync-from-site.json` 中配置的文件：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-from-site.ps1
```

`scripts/sync-from-site.json` 中的每一项都表示“本地文件路径”对应一个“远端 URL”：

```json
{
  "files": [
    {
      "path": "TV/tvbox.json",
      "url": "https://example.com/tvbox.json"
    }
  ]
}
```

如果需要同步更多文件，继续往 `files` 数组里追加即可。

## Mihomo 配置

订阅转换入口配置在 `Mihomo/file/feiyang_custom.yml`：

```yaml
custom:
  clash_rule_base: https://gh-proxy.org/https://raw.githubusercontent.com/feiyang1128/syncFile/refs/heads/main/Mihomo/file/mihomo_rule_provider_base.yml
  enable_rule_generator: false
  overwrite_original_rules: true
  proxy_groups:
    - name: ♻️ 自动选择
      type: url-test
      lazy: false
```

YAML 配置负责订阅转换策略组；`Mihomo/file/mihomo_rule_provider_base.yml` 维护 Mihomo 基础设置、`rule-providers` 和 `rules`。策略组使用对象式 `proxy_groups` 显式设置 `lazy: false`。当前策略组包含：

- `🚀 节点选择`、`♻️ 自动选择`、`🌐 IPV6`、`✨ AI`、`🌍 cloudflare`
- `🔮 负载-轮询`、`🔮 负载-散列`、`🔯 故障转移`
- `🎯 全球直连`、`🛑 全球拦截`、`🐟 漏网之鱼`

所有会进行延迟测试的策略组都统一设置为 3 分钟测试一次：

```ini
interval: 180
```

## 规则来源

`Mihomo/file/mihomo_rule_provider_base.yml` 通过 `rule-providers` 引用的 list 规则集包括：

- `direct`、`proxy`、`ipv6`、`cloudflare-extra`、`reject-extra`
- `reject.list`：来自 Loyalsoldier reject 列表
- `ai`：来自 AI 分流规则
- `unban`：由 workflow 从 ACL4SSR 同步生成

`Update Mihomo rules` workflow 每 6 小时运行一次，会更新：

- `Mihomo/file/list/unban.list`
- `Mihomo/file/list/reject.list`
- `Mihomo/file/list/AI.list`

## APK 和大文件

本地文件和自动同步文件统一按大小判断，不按文件后缀特殊处理。小于 `100 MiB` 的文件可以直接提交：

```powershell
git add app\example.apk
```

本地提交前可以启用仓库内置 hook，让 Git 自动按大小拦截大文件：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-git-hooks.ps1
```

启用后，任何已暂存文件只要大于等于 `104857600` 字节，也就是 `100 MiB`，提交时都会被拦截；小于 `100 MiB` 的文件正常提交。这个判断不区分 `.apk`、`.zip` 或其它后缀。

自动同步 workflow 也只按文件大小判断同步下来的文件是进入 Git 提交，还是发布到 GitHub Release：

- 小于 `104857600` 字节的同步文件进入 Git 提交
- 大于等于 `104857600` 字节的同步文件发布到 `synced-assets-latest` release
- 被 release 管理的文件会在同一次 workflow 里上传，并自动排除出 Git 提交
- release 中使用文件名作为资产名；同名资产会先删除再重新上传，保证始终是最新文件
- 下载地址格式为 `https://github.com/feiyang1128/syncFile/releases/download/synced-assets-latest/<文件名>`

## 自动化

仓库包含两个 GitHub Actions：

- `syncFile`：每小时运行一次，按 `scripts/sync-from-site.json` 同步远端文件。
- `Update Mihomo rules`：每 6 小时运行一次，转换并更新部分 Mihomo 兼容规则。
