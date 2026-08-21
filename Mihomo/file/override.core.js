// JavaScript Override core
// 通用：创建/重置分组、插入策略组、添加外部规则资源

// =====================
// 主逻辑
// =====================

function main(config) {
  return applyOverrideConfig(config, getOverrideConfig());
}

function getOverrideConfig() {
  if (typeof globalThis !== 'undefined' && typeof globalThis.loadOverrideConfig === 'function') {
    return globalThis.loadOverrideConfig();
  }

  if (typeof overrideConfig === 'object' && overrideConfig) {
    return overrideConfig;
  }

  if (typeof globalThis !== 'undefined' && globalThis.overrideConfig && typeof globalThis.overrideConfig === 'object') {
    return globalThis.overrideConfig;
  }

  return {};
}

function applyOverrideConfig(config, configOverride) {
  const userConfig = configOverride && typeof configOverride === 'object' ? configOverride : {};

  // 空配置时原样返回，不给订阅补充任何空字段
  if (!hasOverrideConfig(userConfig)) {
    return config;
  }

  initializeConfig(config);

  const tools = createOverrideTools(config);

  applyGroups(tools, toArray(userConfig.groups));
  applyProxyInsertions(tools, toArray(userConfig.proxyInsertions));
  applyRuleProviders(tools, toArray(userConfig.ruleProviders));
  applyRules(tools, userConfig.rules);

  return config;
}

if (typeof globalThis !== 'undefined') {
  globalThis.main = main;
  globalThis.applyOverrideConfig = applyOverrideConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    main,
    applyOverrideConfig,
  };
}

// 判断是否存在需要执行的用户配置
function hasOverrideConfig(userConfig) {
  const hasListConfig = [userConfig.groups, userConfig.proxyInsertions, userConfig.ruleProviders].some((item) => Array.isArray(item) && item.length > 0);

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

function applyProxyInsertions(tools, proxyInsertions) {
  proxyInsertions.forEach((item) => {
    // 优先使用 proxyNames，同时兼容原有的 proxyName 写法
    const proxyNames = Array.isArray(item.proxyNames) ? item.proxyNames : Array.isArray(item.proxyName) ? item.proxyName : [item.proxyName];

    const startPosition = Number.isInteger(item.position) ? item.position : 1;

    proxyNames
      .map((proxyName) => (typeof proxyName === 'string' ? proxyName.trim() : ''))
      .filter(Boolean)
      .forEach((proxyName, index) => {
        const position = startPosition === -1 ? -1 : startPosition + index;

        tools.insertProxy(item.groupName, proxyName, position);
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
  const groups = config['proxy-groups'];

  // 获取分组
  const getGroup = (name) => {
    return groups.find((item) => item.name === name);
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
      return;
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
    getGroup,
    addGroup,
    resetGroup,
    insertProxy,
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
