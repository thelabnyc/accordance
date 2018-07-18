"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var os = require("os");
var path = require("path");
var yaml = require("js-yaml");
var fs = require("fs");
var t = require("io-ts");
var PathReporter_1 = require("io-ts/lib/PathReporter");
var AccordanceConfigBase = t.type({
    name: t.string,
    local: t.type({
        root: t.string,
    }),
    remote: t.type({
        host: t.string,
        root: t.string,
    }),
    prefer: t.union([
        t.literal('local'),
        t.literal('remote'),
    ]),
});
var AccordanceConfigExtras = t.partial({
    syncIgnore: t.array(t.string),
    watchIgnore: t.array(t.string),
    options: t.dictionary(t.string, t.boolean),
});
var AccordanceConfig = t.intersection([
    AccordanceConfigBase,
    AccordanceConfigExtras,
]);
exports.readConfig = function (configPath, encoding) {
    if (encoding === void 0) { encoding = 'utf8'; }
    var content = fs.readFileSync(configPath, encoding);
    var rawConfig = yaml.safeLoad(content);
    return AccordanceConfig
        .decode(rawConfig)
        .getOrElseL(function (errors) {
        throw new Error(PathReporter_1.failure(errors).join('\n'));
    });
};
var _getIgnorePattern = function (rootPath, unisonIgnore) {
    var groups = unisonIgnore.match(/^([\w]+)\s+(.+)$/);
    if (!groups) {
        return [];
    }
    var ignoreType = groups[1];
    var rawPattern = groups[2];
    switch (ignoreType) {
        case 'Name':
            return [
                rawPattern + "/**",
                "**/" + rawPattern + "/**",
                "**/" + rawPattern,
            ];
        case 'Path':
            return [
                path.join(rootPath, rawPattern),
                path.join(rootPath, rawPattern.replace(/\*/g, '**')),
            ];
    }
    return [
        rawPattern,
    ];
};
exports.getAnyMatchIgnorePatterns = function (rootPath, rules) {
    return rules.reduce(function (memo, rule) {
        return memo.concat(_getIgnorePattern(rootPath, rule));
    }, []);
};
exports.getUnisonConfigPath = function (config) {
    var homeDir = os.homedir();
    var configPath = path.join(homeDir, '.unison', config.name + ".prf");
    return path.normalize(configPath);
};
var _buildUnisonConfigLine = function (key, rawValue) {
    var value;
    if (rawValue === true) {
        value = 'true';
    }
    else if (rawValue === false) {
        value = 'false';
    }
    else {
        value = rawValue;
    }
    return key + " = " + value;
};
exports.buildUnisonConfig = function (config) {
    var e_1, _a;
    // Setup the local and remote roots
    var remoteURL = "ssh://" + config.remote.host + "/" + config.remote.root;
    var lines = [
        _buildUnisonConfigLine('root', config.local.root),
        _buildUnisonConfigLine('root', remoteURL),
    ];
    // Set the preferred root
    if (config.prefer === 'local') {
        lines.push(_buildUnisonConfigLine('prefer', config.local.root));
    }
    else {
        lines.push(_buildUnisonConfigLine('prefer', remoteURL));
    }
    // Add the ignore rules
    if (config.syncIgnore) {
        config.syncIgnore.forEach(function (rule) {
            lines.push(_buildUnisonConfigLine('ignore', rule));
        });
    }
    // Add other misc options
    if (config.options) {
        try {
            for (var _b = __values(Object.keys(config.options)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var opt = _c.value;
                lines.push(_buildUnisonConfigLine(opt, config.options[opt]));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    // Join into a single string
    return lines.join('\n');
};
exports.writeUnisonConfigFile = function (config) {
    var unisonConfigPath = exports.getUnisonConfigPath(config);
    var unisonConfigDir = path.dirname(unisonConfigPath);
    if (!fs.existsSync(unisonConfigDir)) {
        fs.mkdirSync(path.dirname(unisonConfigPath));
    }
    var unisonConfigContent = exports.buildUnisonConfig(config);
    fs.writeFileSync(unisonConfigPath, unisonConfigContent);
};
//# sourceMappingURL=config.js.map