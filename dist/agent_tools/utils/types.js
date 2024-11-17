"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE = exports.RESOURCE_TYPE_CATEGORIES = exports.RESOURCE_TYPE_ID_MAP = exports.RESOURCE_TYPE_CONFIGURATION = void 0;
exports.RESOURCE_TYPE_CONFIGURATION = {
    CPU_Standard: {
        CPU: 100,
        Memory: 100,
    },
    CPU_Intensive: {
        CPU: 200,
        Memory: 200,
    },
    GPU_Standard: {
        CPU: 500,
        Memory: 500,
    },
};
// resource types
exports.RESOURCE_TYPE_ID_MAP = {
    0: "CPU_Standard",
    1: "CPU_Intensive",
    2: "GPU_Standard",
    3: "Storage",
    4: "Bandwidth",
};
// resource type categories
exports.RESOURCE_TYPE_CATEGORIES = {
    cpuInstance: [0, 1, 2],
    storageInstance: [3],
    bandwidthInstance: [4],
};
var ROLE;
(function (ROLE) {
    ROLE["READ"] = "0x917ec7ea41e5f357223d15148fe9b320af36ca576055af433ea3445b39221799";
    ROLE["CONTRACT_BASED_DEPLOYER"] = "0x503cf060389b91af8851125bd70ce66d16d12330718b103fc7674ef6d27e70c9";
    ROLE["ACCESS_MANAGER"] = "0x73d57861095ed1ff7b0e5c00e25f9fc922cf9164e617149ee7073f371364c954";
    ROLE["BILLING_MANAGER"] = "0xfc4d5b8dc48f53079d1753f1e53aabb674d1bdef461b3803bef96591e9ef3969";
})(ROLE || (exports.ROLE = ROLE = {}));
;
