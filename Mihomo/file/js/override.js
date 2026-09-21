// JavaScript Override
// 通用：创建/重置节点和分组、插入策略组、添加外部规则资源

// =====================
// 用户配置
// =====================

// 所有配置项均可省略。当前示例全部被注释，脚本默认不会修改订阅。
// 使用时取消需要部分的注释即可。
const overrideConfig = {
  // =====================
  // 代理组配置
  // =====================
  // groups: [ 
  //     // 完整的 Mihomo 代理组配置
  //   {
  //     config: {
  //       name: '专线',
  //       type: 'url-test',
  //       'include-all': true,
  //       'exclude-type': 'direct',
  //       filter: '专线',
  //       url: 'https://www.gstatic.com/generate_204',
  //       interval: 180,
  //       lazy: true,
  //     },
  //     // add：不存在时添加，已存在时跳过
  //     // reset：删除同名分组后重建，不存在时直接创建
  //     action: 'add',
  //     // 可省略
  //     // add 默认最后一位
  //     // reset 默认保持原位置，不存在时放到最后
  //     // 1 第一位，2 第二位，-1 最后一位
  //     position: -1,
  //   },
  // ],
  // =====================
  // 代理节点配置
  // =====================
  // proxies: [
  //   {
  //     // 完整的 Mihomo 代理节点配置；name 必填
  //     config: {
  //       name: '自建节点',
  //       type: 'ss',
  //       server: 'example.com',
  //       port: 443,
  //       cipher: '2022-blake3-aes-128-gcm',
  //       password: 'password',
  //     },
  //     // add：不存在时添加，已存在时跳过
  //     // reset：删除同名节点后重建，不存在时直接创建
  //     action: 'add',
  //     // 可省略
  //     // add 默认最后一位
  //     // reset 默认保持原位置，不存在时放到最后
  //     // 1 第一位，2 第二位，-1 最后一位
  //     position: -1,
  //     // 可省略；创建节点后顺手插入这些策略组，目标组不存在时跳过
  //     // 不写 groupNames/groupName：不干预分组；若源配置有 include-all: true，节点仍会被自动包含
  //     // groupNames: []：明确不加入任何分组；节点会被自动排除出所有 include-all: true 的分组
  //     // groupNames: ['分组名']：只加入指定分组；节点会被自动排除出其它 include-all: true 的分组
  //     groupNames: ['🚀 节点选择'],
  //     // 可省略，默认插到策略组最后；1 第一位，2 第二位，-1 最后一位
  //     groupPosition: -1,
  //   },
  // ],
  // =====================
  // 代理组插入代理组配置
  // =====================
  // proxyInsertions: [
  //   {
  //     // 目标分组名称；不存在时跳过
  //     groupName: '良心云',
  //     // 要插入的策略组名称；不存在时跳过
  //     // 空字符串、纯空格和非字符串值会被忽略
  //     proxyNames: ['专线'],
  //     // 可省略，默认从第一位开始连续插入
  //     // 1 第一位，2 第二位，-1 最后一位
  //     position: 1,
  //   },
  // ],
  // =====================
  // 外部规则资源配置
  // =====================
  // ruleProviders: [
  //   {
  //     // 规则资源名称，必填；同名资源已存在时跳过
  //     name: 'aiRule',
  //     // 可省略，默认 http
  //     // http：从远程地址下载
  //     // file：读取本地文件
  //     // inline：直接使用 payload 中的规则
  //     type: 'http',
  //     // type 为 http 时必填
  //     url: 'https://gh-proxy.org/https://raw.githubusercontent.com/feiyang1128/syncFile/refs/heads/main/Mihomo/file/txt/AI.txt',
  //     // type 为 http 时可省略，默认 ./rule/<name>.yaml
  //     // type 为 file 时必填
  //     path: './rule/aiRule.yaml',
  //     // 可省略，默认 classical
  //     // classical：完整路由规则，例如 DOMAIN-SUFFIX、IP-CIDR、GEOIP
  //     // domain：仅包含域名或域名通配符
  //     // ipcidr：仅包含 IPv4/IPv6 CIDR
  //     behavior: 'classical',
  //     // 可省略，默认 yaml；还支持 text、mrs
  //     format: 'yaml',
  //     // type 为 http 时可省略，默认 3600 秒
  //     interval: 3600,
  //     // type 为 inline 时必填，此时不需要 url 和 path
  //     // payload: ['DOMAIN-SUFFIX,openai.com'],
  //   },
  // ],
  // =====================
  // 路由规则配置
  // =====================
  // rules: {
  //   // add：保留原规则，新增规则放到第一个 MATCH 之前
  //   // reset：清空全部原规则（包括所有 MATCH），再写入 items
  //   // add 和 reset 互斥，只能选择一个
  //   action: 'add',
  //   // 需要新增或重置写入的规则
  //   items: [
  //     {
  //       rule: 'RULE-SET,aiRule,专线',
  //       // 可省略，默认按照 items 的顺序从第一条开始排列
  //       // 1 第一条，2 第二条
  //       // add 模式下 -1 表示第一个 MATCH 之前的最后一条
  //       // reset 模式下 -1 表示整个规则列表的最后一条
  //       position: 1,
  //     },
  //   ],
  // },
};

// =====================
// 主函数
// =====================

function main(config) {
  const userConfig = overrideConfig && typeof overrideConfig === 'object' ? overrideConfig : {};

  // 空配置时原样返回，不给订阅补充任何空字段
  if (!hasOverrideConfig(userConfig)) {
    return config;
  }

  initializeConfig(config);

  const tools = createOverrideTools(config);

  applyGroups(tools, toArray(userConfig.groups));
  applyProxies(tools, toArray(userConfig.proxies));
  applyProxyInsertions(tools, toArray(userConfig.proxyInsertions));
  applyRuleProviders(tools, toArray(userConfig.ruleProviders));
  applyRules(tools, userConfig.rules);

  return config;
}

// 判断是否存在需要执行的用户配置
function hasOverrideConfig(userConfig) {
  const hasListConfig = [userConfig.groups, userConfig.proxies, userConfig.proxyInsertions, userConfig.ruleProviders].some((item) => Array.isArray(item) && item.length > 0);

  if (hasListConfig) {
    return true;
  }

  if (Array.isArray(userConfig.rules)) {
    return userConfig.rules.length > 0;
  }

  if (!userConfig.rules || typeof userConfig.rules !== 'object') {
    return false;
  }

  if (userConfig.rules.action === 'reset') {
    return true;
  }

  return userConfig.rules.action === 'add' && Array.isArray(userConfig.rules.items) && userConfig.rules.items.length > 0;
}

// =====================
// 初始化
// =====================

function initializeConfig(config) {
  if (!Array.isArray(config.proxies)) {
    config.proxies = [];
  }

  if (!Array.isArray(config['proxy-groups'])) {
    config['proxy-groups'] = [];
  }

  if (!config['rule-providers'] || typeof config['rule-providers'] !== 'object' || Array.isArray(config['rule-providers'])) {
    config['rule-providers'] = {};
  }

  if (!Array.isArray(config.rules)) {
    config.rules = [];
  }
}

// 将配置安全转换为数组
// 字段缺失、null 或类型错误时返回空数组
function toArray(value) {
  return Array.isArray(value) ? value : [];
}

// =====================
// 应用用户配置
// =====================

function applyGroups(tools, groups) {
  groups.forEach((item) => {
    if (item.action === 'reset') {
      tools.resetGroup(item.config, item.position);
    } else {
      tools.addGroup(item.config, item.position);
    }
  });
}

function applyProxies(tools, proxies) {
  proxies.forEach((item) => {
    const proxyName = item?.action === 'reset' ? tools.resetProxy(item.config, item.position) : tools.addProxy(item?.config, item?.position);

    if (!proxyName) {
      return;
    }

    const hasGroupConfig = Object.prototype.hasOwnProperty.call(item, 'groupNames') || Object.prototype.hasOwnProperty.call(item, 'groupName');
    const groupNameConfig = Array.isArray(item.groupNames) ? item.groupNames : Array.isArray(item.groupName) ? item.groupName : [item.groupName];
    const groupNames = groupNameConfig
      .map((groupName) => (typeof groupName === 'string' ? groupName.trim() : ''))
      .filter(Boolean);
    const groupPosition = Number.isInteger(item.groupPosition) ? item.groupPosition : -1;

    if (hasGroupConfig) {
      tools.excludeProxyFromOtherIncludeAllGroups(proxyName, groupNames);
    }

    groupNames.forEach((groupName) => {
      tools.insertProxy(groupName, proxyName, groupPosition);
    });
  });
}

function applyProxyInsertions(tools, proxyInsertions) {
  proxyInsertions.forEach((item) => {
    const groupName = typeof item.groupName === 'string' ? item.groupName.trim() : '';

    // 优先使用 proxyNames，同时兼容原有的 proxyName 写法
    const proxyNames = (Array.isArray(item.proxyNames) ? item.proxyNames : Array.isArray(item.proxyName) ? item.proxyName : [item.proxyName])
      .map((proxyName) => (typeof proxyName === 'string' ? proxyName.trim() : ''))
      .filter(Boolean);

    const startPosition = Number.isInteger(item.position) ? item.position : 1;

    proxyNames.forEach((proxyName, index) => {
      const position = startPosition === -1 ? -1 : startPosition + index;

      if (tools.getGroup(proxyName)) {
        tools.insertProxy(groupName, proxyName, position);
      }
    });
  });
}

function applyRuleProviders(tools, ruleProviders) {
  ruleProviders.forEach((item) => {
    tools.addRuleProvider(item);
  });
}

function applyRules(tools, rulesConfig) {
  // 兼容旧的数组格式，旧格式统一按 add 处理
  const isLegacyArray = Array.isArray(rulesConfig);
  const action = isLegacyArray ? 'add' : rulesConfig?.action;
  const items = isLegacyArray ? rulesConfig : toArray(rulesConfig?.items);

  if (action !== 'add' && action !== 'reset') {
    return;
  }

  if (action === 'reset') {
    tools.resetRules();
  }

  const validItems = items
    .filter((item) => item && typeof item.rule === 'string')
    .map((item) => ({
      ...item,
      rule: item.rule.trim(),
    }))
    .filter((item) => item.rule);

  validItems.forEach((item, index) => {
    const rule = item.rule;

    const position = Number.isInteger(item.position) ? item.position : index + 1;

    if (action === 'add') {
      tools.insertRuleBeforeMatch(rule, position);
    } else {
      tools.insertRule(rule, position);
    }
  });
}

// =====================
// 通用工具
// =====================

function createOverrideTools(config) {
  const proxies = config.proxies;
  const groups = config['proxy-groups'];

  // 获取代理节点
  const getProxy = (name) => {
    return proxies.find((item) => item.name === name);
  };

  // 获取分组
  const getGroup = (name) => {
    return groups.find((item) => item.name === name);
  };

  const normalizeProxyConfig = (proxyConfig) => {
    if (!proxyConfig || typeof proxyConfig !== 'object' || Array.isArray(proxyConfig)) {
      return null;
    }

    const name = typeof proxyConfig.name === 'string' ? proxyConfig.name.trim() : '';

    if (!name) {
      return null;
    }

    return {
      ...proxyConfig,
      name,
    };
  };

  // 添加代理节点
  // position:
  // 1  第一位
  // 2  第二位
  // -1 最后一位
  const addProxy = (proxyConfig, position = -1) => {
    const normalizedConfig = normalizeProxyConfig(proxyConfig);

    if (!normalizedConfig) {
      return null;
    }

    if (getProxy(normalizedConfig.name)) {
      return normalizedConfig.name;
    }

    insertAt(proxies, normalizedConfig, position);

    return normalizedConfig.name;
  };

  // 重置代理节点
  // 未指定 position：
  // - 节点存在时保持原位置
  // - 节点不存在时放到最后
  const resetProxy = (proxyConfig, position) => {
    const normalizedConfig = normalizeProxyConfig(proxyConfig);

    if (!normalizedConfig) {
      return null;
    }

    const oldIndex = proxies.findIndex((item) => item.name === normalizedConfig.name);

    if (oldIndex !== -1) {
      proxies.splice(oldIndex, 1);
    }

    const targetPosition = position === undefined ? (oldIndex === -1 ? -1 : oldIndex + 1) : position;

    insertAt(proxies, normalizedConfig, targetPosition);

    return normalizedConfig.name;
  };

  // 添加分组
  // position:
  // 1  第一位
  // 2  第二位
  // -1 最后一位
  const addGroup = (groupConfig, position = -1) => {
    if (getGroup(groupConfig.name)) {
      return;
    }

    insertAt(groups, groupConfig, position);
  };

  // 重置分组
  // 未指定 position：
  // - 分组存在时保持原位置
  // - 分组不存在时放到最后
  const resetGroup = (groupConfig, position) => {
    const oldIndex = groups.findIndex((item) => item.name === groupConfig.name);

    if (oldIndex !== -1) {
      groups.splice(oldIndex, 1);
    }

    const targetPosition = position === undefined ? (oldIndex === -1 ? -1 : oldIndex + 1) : position;

    insertAt(groups, groupConfig, targetPosition);
  };

  // 将代理或策略组插入指定分组
  // position:
  // 1  第一位
  // 2  第二位
  // -1 最后一位
  const insertProxy = (groupName, proxyName, position = 1) => {
    const group = getGroup(groupName);

    // 目标分组不存在时安全跳过
    if (!group) {
      return false;
    }

    if (!Array.isArray(group.proxies)) {
      group.proxies = [];
    }

    // 已存在时先移除，再放到指定位置
    const oldIndex = group.proxies.indexOf(proxyName);

    if (oldIndex !== -1) {
      group.proxies.splice(oldIndex, 1);
    }

    insertAt(group.proxies, proxyName, position);
    return true;
  };

  const excludeProxyFromOtherIncludeAllGroups = (proxyName, includedGroupNames) => {
    const includedGroupNameSet = new Set(
      toArray(includedGroupNames)
        .map((groupName) => (typeof groupName === 'string' ? groupName.trim() : ''))
        .filter(Boolean)
    );

    groups.forEach((group) => {
      if (!group || group['include-all'] !== true || includedGroupNameSet.has(group.name)) {
        return;
      }

      appendExcludeFilter(group, proxyName);
    });
  };

  // 插入规则
  // position:
  // 1  第一条
  // 2  第二条
  // -1 最后一条
  const insertRule = (rule, position = 1) => {
    // 已存在时保留原规则和原位置
    if (config.rules.includes(rule)) {
      return;
    }

    insertAt(config.rules, rule, position);
  };

  // 将规则插入到第一个 MATCH 之前
  // position 使用从 1 开始的位置
  // -1 表示紧贴第一个 MATCH 之前；没有 MATCH 时放到最后
  const insertRuleBeforeMatch = (rule, position = 1) => {
    if (config.rules.includes(rule)) {
      return;
    }

    const matchIndex = config.rules.findIndex((item) => {
      return typeof item === 'string' && /^MATCH(?:,|$)/i.test(item.trim());
    });

    const lastInsertIndex = matchIndex === -1 ? config.rules.length : matchIndex;

    if (position === -1) {
      config.rules.splice(lastInsertIndex, 0, rule);
      return;
    }

    const targetIndex = Math.min(Math.max(0, position - 1), lastInsertIndex);

    config.rules.splice(targetIndex, 0, rule);
  };

  // 清空全部规则
  const resetRules = () => {
    config.rules.splice(0, config.rules.length);
  };

  // 添加规则资源
  // 支持传入完整配置对象，同时兼容旧的参数调用方式
  const addRuleProvider = (providerConfig, legacyUrl, legacyPath, legacyBehavior = 'classical', legacyInterval = 3600) => {
    let name;
    let provider;

    if (providerConfig && typeof providerConfig === 'object' && !Array.isArray(providerConfig)) {
      ({ name, ...provider } = providerConfig);
      provider.type = provider.type || 'http';
      provider.behavior = provider.behavior || 'classical';

      if (provider.type === 'http') {
        provider.path = provider.path || `./rule/${name}.yaml`;
        provider.interval = Number.isFinite(provider.interval) ? provider.interval : 3600;
      }
    } else {
      name = providerConfig;
      provider = {
        type: 'http',
        behavior: legacyBehavior,
        url: legacyUrl,
        path: legacyPath || `./rule/${name}.yaml`,
        interval: legacyInterval,
      };
    }

    if (typeof name !== 'string' || !name.trim()) {
      return;
    }

    name = name.trim();

    if (config['rule-providers'][name]) {
      return;
    }

    if (!['http', 'file', 'inline'].includes(provider.type)) {
      return;
    }

    if (
      (provider.type === 'http' && !provider.url) ||
      (provider.type === 'file' && !provider.path) ||
      (provider.type === 'inline' && !Array.isArray(provider.payload))
    ) {
      return;
    }

    config['rule-providers'][name] = provider;
  };

  return {
    getProxy,
    getGroup,
    addProxy,
    resetProxy,
    addGroup,
    resetGroup,
    insertProxy,
    excludeProxyFromOtherIncludeAllGroups,
    insertRule,
    insertRuleBeforeMatch,
    resetRules,
    addRuleProvider,
  };
}

// =====================
// 数组插入工具
// =====================

function insertAt(list, item, position = -1) {
  if (position === -1) {
    list.push(item);
    return;
  }

  // position 使用从 1 开始的实际位置；小于 1 时按第一位处理
  const targetIndex = Math.max(0, position - 1);

  if (targetIndex >= list.length) {
    list.push(item);
    return;
  }

  list.splice(targetIndex, 0, item);
}

function appendExcludeFilter(group, proxyName) {
  if (typeof proxyName !== 'string' || !proxyName.trim()) {
    return;
  }

  const escapedProxyName = escapeRegExp(proxyName.trim());
  const proxyNamePattern = `^${escapedProxyName}$`;
  const currentFilter = typeof group['exclude-filter'] === 'string' ? group['exclude-filter'].trim() : '';

  if (!currentFilter) {
    group['exclude-filter'] = proxyNamePattern;
    return;
  }

  if (currentFilter.includes(proxyNamePattern)) {
    return;
  }

  group['exclude-filter'] = `${currentFilter}|${proxyNamePattern}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
