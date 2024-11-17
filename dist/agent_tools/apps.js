"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateBalanceForCreateAppTool = exports.estimateBalanceTool = exports.getDeploymentStatusTool = exports.deleteAppTool = exports.getAppDetailsTool = exports.getAppIdTool = exports.updateAppTool = exports.createAppTool = exports.getAppsTool = void 0;
const init_1 = require("../skynet/init");
const types_1 = require("@decloudlabs/skynet/lib/types/types");
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const types_2 = require("./utils/types");
const getApps = (projectId) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const apps = yield skyNode.appManager.contractCall.getAppList(projectId);
    let appNameList = [];
    if (!apps.success) {
        return {
            success: false,
            data: new Error("Failed to get apps : " + apps.data.toString())
        };
    }
    for (const app of apps.data) {
        appNameList.push(app.appName);
    }
    return {
        success: true,
        data: appNameList
    };
});
const getAppId = (projectId, appName) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const apps = yield skyNode.appManager.contractCall.getAppList(projectId);
    if (!apps.success) {
        return {
            success: false,
            data: new Error("Failed to get apps : " + apps.data.toString())
        };
    }
    for (const app of apps.data) {
        if (app.appName === appName) {
            return {
                success: true,
                data: app.appID
            };
        }
    }
    return {
        success: false,
        data: new Error("App not found")
    };
});
const createApp = (projectId_1, appName_1, dockerImageName_1, dockerTag_1, containerPort_1, resourceType_1, resourceCount_1, multiplier_1, balance_1, ...args_1) => __awaiter(void 0, [projectId_1, appName_1, dockerImageName_1, dockerTag_1, containerPort_1, resourceType_1, resourceCount_1, multiplier_1, balance_1, ...args_1], void 0, function* (projectId, appName, dockerImageName, dockerTag, containerPort, resourceType, resourceCount, multiplier, balance, environmentVariables = []) {
    const skyNode = yield (0, init_1.getSkynet)();
    const contractApp = {
        nftID: projectId,
        appID: "",
        appName: `${appName}`,
        appPath: Buffer.from(types_1.STORAGE_TYPE.LIGHTHOUSE + '/').toString('hex'),
        modPath: Buffer.from(types_1.STORAGE_TYPE.LIGHTHOUSE + '/').toString('hex'),
        appSubnetConfig: [{
                resourceType: resourceType,
                resourceCount: resourceCount,
                multiplier: multiplier
            }],
        subnetList: ["0"],
        cidLock: false,
        nftRange: [[projectId, projectId]]
    };
    let subscriptionParam = {
        licenseAddress: "0x0000000000000000000000000000000000000000",
        supportAddress: "0x3C904a5f23f868f309a6DB2a428529F33848f517",
        platformAddress: "0xBC6200490F4bFC9092eA2987Ddb1Df478997e0cd",
        referralAddress: "0x0000000000000000000000000000000000000000",
        createTime: 0
    };
    const createTimeResp = yield skyNode.dripRateManager.getSubscriptionParam(projectId);
    if (createTimeResp && createTimeResp.success) {
        if (createTimeResp.data.createTime > 0) {
            subscriptionParam.createTime = createTimeResp.data.createTime;
        }
    }
    const dripRateFactors = {
        licenseFactor: 0,
        supportFactor: 0,
        platformFactor: 0,
        referralFactor: 0,
        discountFactor: 0,
        referralExpiryDuration: 0,
        createTime: 0,
        daoRate: 0
    };
    const appPayload = {
        appName: `${appName}`,
        nftID: `${projectId}`,
        namespace: `n${projectId}`,
        persistence: [],
        containers: [
            {
                name: `${appName}`,
                image: `${dockerImageName}:${dockerTag}`,
                tcpPorts: [],
                httpPorts: [
                    {
                        hostURL: {
                            urlString: `${appName}-n${projectId}.stackos.io`,
                            createMode: 'CREATE',
                        },
                        containerPort: containerPort.toString(),
                        servicePort: "80"
                    },
                ],
                args: [],
                envVariables: environmentVariables,
                resourceLimits: {
                    cpu: 300,
                    memory: 300,
                },
                resourceRequests: {
                    cpu: 300,
                    memory: 300,
                },
                volumeMounts: [],
            },
        ],
        replicaCount: 1,
        whitelistedIps: ['0.0.0.0/0'],
        status: ""
    };
    const appModifier = {
        modAttribVar: {},
        contractParam: {},
        loggerURL: "https://appsender.skynet.io/api/appStatus"
    };
    const createAppResponse = yield skyNode.appManager.createApp(contractApp, subscriptionParam, dripRateFactors, [balance], appPayload, appModifier, (status) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('status', status);
    }), { fetchAppList: true, fetchSubscriptionParam: true, fetchBalanceForSubscription: true, getDeploymentStatus: false });
    if (createAppResponse.success) {
        return {
            success: true,
            data: `https://${appName}-n${projectId}.stackos.io`
        };
    }
    return {
        success: false,
        data: new Error(createAppResponse.data.toString())
    };
});
const updateApp = (projectId, appId, appName, appPayload, contractApp) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const appDetails = yield getAppDetails(projectId, appId);
    if (!appDetails.success) {
        return {
            success: false,
            data: new Error(appDetails.data.toString())
        };
    }
    let subscriptionParam = {
        licenseAddress: "0x0000000000000000000000000000000000000000",
        supportAddress: "0x3C904a5f23f868f309a6DB2a428529F33848f517",
        platformAddress: "0xBC6200490F4bFC9092eA2987Ddb1Df478997e0cd",
        referralAddress: "0x0000000000000000000000000000000000000000",
        createTime: 0
    };
    const createTimeResp = yield skyNode.dripRateManager.getSubscriptionParam(projectId);
    if (createTimeResp && createTimeResp.success) {
        if (createTimeResp.data.createTime > 0) {
            subscriptionParam.createTime = createTimeResp.data.createTime;
        }
    }
    const dripRateFactors = {
        licenseFactor: 0,
        supportFactor: 0,
        platformFactor: 0,
        referralFactor: 0,
        discountFactor: 0,
        referralExpiryDuration: 0,
        createTime: 0,
        daoRate: 0
    };
    const appModifier = {
        modAttribVar: {},
        contractParam: {},
        loggerURL: "https://appsender.skynet.io/api/appStatus"
    };
    const createAppResponse = yield skyNode.appManager.createApp(contractApp, subscriptionParam, dripRateFactors, ['2455200000000000'], appPayload, appModifier, (status) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('status', status);
    }), { fetchAppList: true, fetchSubscriptionParam: true, fetchBalanceForSubscription: true, getDeploymentStatus: false });
    if (createAppResponse.success) {
        return {
            success: true,
            data: `https://${appName}-n${projectId}.stackos.io`
        };
    }
    return {
        success: false,
        data: new Error(createAppResponse.data.toString())
    };
});
const estimateBalance = (projectId, duration) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const appList = yield skyNode.appManager.contractCall.getAppList(projectId);
    if (!appList.success) {
        return {
            success: false,
            data: new Error(appList.data.toString())
        };
    }
    const estimateBalanceRes = yield skyNode.dripRateManager.estimateBalance(appList.data, duration);
    if (estimateBalanceRes.success) {
        return {
            success: true,
            data: estimateBalanceRes.data
        };
    }
    return {
        success: false,
        data: new Error(estimateBalanceRes.data.toString())
    };
});
const estimateBalanceForCreateApp = (contractApp, duration) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const estimateBalanceRes = yield skyNode.dripRateManager.estimateBalance([contractApp], duration);
    console.log("estimateBalanceRes", estimateBalanceRes);
    return estimateBalanceRes;
});
const getAppDetails = (projectId, appName) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const appsList = yield skyNode.appManager.contractCall.getAppList(projectId);
    if (!appsList.success) {
        return {
            success: false,
            data: new Error(appsList.data.toString())
        };
    }
    for (const app of appsList.data) {
        if (app.appName === appName) {
            const appPayloadRes = yield skyNode.appManager.fetchAndDecryptApp(app, {
                roleType: "OWNER"
            });
            if (appPayloadRes.success) {
                return {
                    success: true,
                    data: {
                        appPayload: JSON.parse(appPayloadRes.data.appPayload),
                        contractApp: app
                    }
                };
            }
            else {
                return {
                    success: false,
                    data: new Error(appPayloadRes.data.toString())
                };
            }
        }
    }
    return {
        success: false,
        data: new Error("App not found")
    };
});
const deleteApp = (projectId, appId) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const deleteAppResponse = yield skyNode.appManager.deleteApp(projectId, appId, (status) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('status', status);
    }));
    if (deleteAppResponse.success) {
        return {
            success: true,
            data: "App deleted successfully"
        };
    }
    return {
        success: false,
        data: new Error(deleteAppResponse.data.toString())
    };
});
const getDeploymentStatus = (projectId, appId) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const deploymentStatus = yield skyNode.appManager.getDeploymentStatusFromLogger(projectId, appId, 'https://appsender.skynet.io/api/appStatus', new Date(Date.now() - 1 * 60 * 1000), 1000);
    return deploymentStatus;
});
exports.getAppsTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ nftId }) {
    return yield getApps(nftId);
}), {
    name: "get_apps_of_nft",
    schema: zod_1.z.object({
        nftId: zod_1.z.string().describe("NFT ID is a number converted to a string required to get the apps of a given nft")
    }),
    description: "This tool is used to get the apps of a given nft",
});
exports.createAppTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, appName, dockerImageName, dockerTag, containerPort, resourceType, resourceCount, multiplier, balance, environmentVariables }) {
    console.log(projectId, appName, dockerImageName, dockerTag, containerPort, resourceType, resourceCount, multiplier, balance, environmentVariables);
    return yield createApp(projectId, appName, dockerImageName, dockerTag, containerPort, resourceType, resourceCount, multiplier, balance, environmentVariables);
}), {
    name: "create_app",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId ID is a number converted to a string required to create an app"),
        appName: zod_1.z.string().describe("App name is the name of the app to be created, it should not exceed more than 32 bytes"),
        dockerImageName: zod_1.z.string().describe("Docker image name is the name of the docker image to be used"),
        dockerTag: zod_1.z.string().describe("Docker tag is the tag of the docker image to be used"),
        containerPort: zod_1.z.number().describe("Container port is the port of the docker container to be used"),
        resourceType: zod_1.z.array(zod_1.z.number()).describe("Resource type is an array of numbers where each element is an id of a service provided by subnet. use only one resource type at a time, these are the resource type definations " + JSON.stringify(types_2.RESOURCE_TYPE_CONFIGURATION) + " " + JSON.stringify(types_2.RESOURCE_TYPE_CATEGORIES) + " " + JSON.stringify(types_2.RESOURCE_TYPE_ID_MAP)),
        resourceCount: zod_1.z.array(zod_1.z.number()).describe("Resource count is an array of numbers which are the count of the resource type to be used, use only one resource count at a time, example : if you want 200 mb ram then take resource type as CPU_STANDARD which has 100mb of ram and take resource count as 2"),
        multiplier: zod_1.z.array(zod_1.z.number()).describe("Multiplier is an array of numbers which are the replica count of the resource type to be used, use only one multiplier at a time, example : if you want 2 instances of 1 cpu standard then it should be 2"),
        balance: zod_1.z.string().describe("Balance is the balance of the project to be used to create the app, it should be in wei"),
        environmentVariables: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string().describe("Name is the name of the environment variable to be updated"),
            value: zod_1.z.string().describe("Value is the value of the environment variable to be updated")
        })).describe("Environment variables are optional if not required can be passed as empty array and can be used to set the environment variables for the app"),
    }),
    description: "This tool is used to create an app, generate a app name with lowercase letters and no special characters no underscores no numbers and should not exceed more than 32 bytes, for params for resource type, resource count, multiplier, see the definations at " + JSON.stringify(types_2.RESOURCE_TYPE_CONFIGURATION) + " " + JSON.stringify(types_2.RESOURCE_TYPE_CATEGORIES) + " " + JSON.stringify(types_2.RESOURCE_TYPE_ID_MAP),
});
exports.updateAppTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, appId, appName, appPayload, contractApp }) {
    return yield updateApp(projectId, appId, appName, appPayload, contractApp);
}), {
    name: "update_app",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId ID is a number converted to a string required to update an app"),
        appId: zod_1.z.string().describe("App ID is the id of the app to be updated"),
        appName: zod_1.z.string().describe("App name is the name of the app to be updated, it should not exceed more than 32 bytes"),
        appPayload: zod_1.z.any().describe(`App payload is the payload of the app to be updated, it should match the app payload definations at  {appName: string;
    namespace: string;
    nftID: string;
    containers: {
        name: string;
        image: string;
        tcpPorts: Port[];
        httpPorts: Port[];
        args?: string[];
        commands?: string[];
        envVariables?: CreateAppEnvVariables[];
        volumeMounts?: CreateAppVolumeMounts[];
        resourceLimits: ResourceUnit;
        resourceRequests: ResourceUnit;
    }[];
    replicaCount: number;
    whitelistedIps: string[];
    persistence: {
        name: string;
        accessMode: "ReadWriteOnce";
        storageType: "standard" | "ssd-sc";
        storageSize?: string;
    }[];
    status: string;
    privateImage?: {
        registry: string;
        username: string;
        password: string;
    };
    attribVarList?: AttribVariableParam[];
} interface CreateAppEnvVariables {
    name: string;
    value: string;
} interface CreateAppVolumeMounts {
    mountPath: string;
    name: string;
} interface ResourceUnit {
    memory: number;
    cpu: number;
    disk?: number;
} interface AttribVariableParam {
    name: string;
    condition: string;
    conditionDescription?: string;
    defaultValue?: string;
} interface Port {
    containerPort: string;
    servicePort: string;
    hostURL?: {
        urlString: string;
        createMode: "CUSTOM" | "CREATE";
    };
}`),
        contractApp: zod_1.z.object({
            nftID: zod_1.z.string().describe("NFT ID is the project id number converted to a string required to update an app"),
            appID: zod_1.z.string().describe("App ID is the id of the app to be updated"),
            appName: zod_1.z.string().describe("App name is the name of the app to be updated, it should not exceed more than 32 bytes"),
            appPath: zod_1.z.string().describe("App path is the path of the app to be updated"),
            modPath: zod_1.z.string().describe("Mod path is the path of the app to be updated"),
            appSubnetConfig: zod_1.z.array(zod_1.z.object({
                resourceType: zod_1.z.array(zod_1.z.number()).describe("Resource type is an array of numbers where each element is an id of a service provided by subnet. use only one resource type at a time, these are the resource type definations " + JSON.stringify(types_2.RESOURCE_TYPE_CONFIGURATION) + " " + JSON.stringify(types_2.RESOURCE_TYPE_CATEGORIES) + " " + JSON.stringify(types_2.RESOURCE_TYPE_ID_MAP)),
                resourceCount: zod_1.z.array(zod_1.z.number()).describe("Resource count is an array of numbers which are the count of the resource type to be used, use only one resource count at a time, example : if you want 200 mb ram then take resource type as CPU_STANDARD which has 100mb of ram and take resource count as 2"),
                multiplier: zod_1.z.array(zod_1.z.number()).describe("Multiplier is an array of numbers which are the replica count of the resource type to be used, use only one multiplier at a time, example : if you want 2 instances of 1 cpu standard then it should be 2"),
            })),
            subnetList: zod_1.z.array(zod_1.z.string()).describe("Subnet list is the list of the subnets to be used, it should be 0"),
            cidLock: zod_1.z.boolean().describe("Cid lock is the lock status of the app to be updated, it should be false")
        })
    }),
    description: "This tool is used to update an app, for params for app payload, see the definations at " + JSON.stringify(types_2.RESOURCE_TYPE_CONFIGURATION) + " " + JSON.stringify(types_2.RESOURCE_TYPE_CATEGORIES) + " " + JSON.stringify(types_2.RESOURCE_TYPE_ID_MAP),
});
exports.getAppIdTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, appName }) {
    return yield getAppId(projectId, appName);
}), {
    name: "get_app_id",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId ID is a number converted to a string required to get the app id"),
        appName: zod_1.z.string().describe("App name is the name of the app to get the id"),
    }),
    description: "This tool is used to get the app id of a given app name, you can get the app name by using get_apps_of_nft tool",
});
exports.getAppDetailsTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, appName }) {
    return yield getAppDetails(projectId, appName);
}), {
    name: "get_app_details",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId ID is a number converted to a string required to get the app id"),
        appName: zod_1.z.string().describe("App name is the name of the app to get the id"),
    }),
    description: "This tool is used to get the details of a given app name, you can get the app name by using get_apps_of_nft tool, for this tool to work you need to have the ownership of the project, this will return the app payload and the contract app",
});
exports.deleteAppTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, appId }) {
    return yield deleteApp(projectId, appId);
}), {
    name: "delete_app",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId ID is a number converted to a string required to delete an app"),
        appId: zod_1.z.string().describe("App ID is the id of the app to be deleted"),
    }),
    description: "This tool is used to delete an app, you can get the app id by using get_app_id tool",
});
exports.getDeploymentStatusTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, appId }) {
    return yield getDeploymentStatus(projectId, appId);
}), {
    name: "get_deployment_status",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId ID is a number converted to a string required to get the deployment status"),
        appId: zod_1.z.string().describe("App ID is the id of the app to get the deployment status"),
    }),
    description: "This tool is used to get the deployment status of a given app id, you can get the app id by using get_app_id tool, this will return the deployment status of the app",
});
exports.estimateBalanceTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, duration }) {
    return yield estimateBalance(projectId, duration);
}), {
    name: "estimate_balance",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId ID is a number converted to a string required to estimate the balance"),
        duration: zod_1.z.number().describe("Duration is the duration for which the balance is to be estimated, it is calculated in seconds"),
    }),
    description: "This tool is used to estimate the balance of a given project id for a given duration only for existing apps and project id",
});
exports.estimateBalanceForCreateAppTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ contractApp, duration }) {
    return yield estimateBalanceForCreateApp(contractApp, duration);
}), {
    name: "estimate_balance_for_create_app",
    schema: zod_1.z.object({
        contractApp: zod_1.z.object({
            nftID: zod_1.z.string().describe("NFT ID is the project id number converted to a string required to estimate the balance"),
            appID: zod_1.z.string().describe("App ID is the id of the app to be created, it should be 0"),
            appName: zod_1.z.string().describe("App name is the name of the app to be created, it should not exceed more than 32 bytes"),
            appPath: zod_1.z.string().describe("App path is the path of the app to be created, it should be 0"),
            modPath: zod_1.z.string().describe("Mod path is the path of the app to be created, it should be 0"),
            appSubnetConfig: zod_1.z.array(zod_1.z.object({
                resourceType: zod_1.z.array(zod_1.z.number()).describe("Resource type is an array of numbers where each element is an id of a service provided by subnet. thse are the resource type definations " + JSON.stringify(types_2.RESOURCE_TYPE_CONFIGURATION) + " " + JSON.stringify(types_2.RESOURCE_TYPE_CATEGORIES) + " " + JSON.stringify(types_2.RESOURCE_TYPE_ID_MAP)),
                resourceCount: zod_1.z.array(zod_1.z.number()).describe("Resource count is an array of numbers which are the count of the resource type to be used, example : if you want 200 mb ram then take resource type as CPU_STANDARD which has 100mb of ram and take resource count as 2"),
                multiplier: zod_1.z.array(zod_1.z.number()).describe("Multiplier is an array of numbers which are the replica count of the resource type to be used, example : if you want 2 instances of 1 cpu standard then it should be 2"),
            })),
            subnetList: zod_1.z.array(zod_1.z.string()).describe("Subnet list is the list of the subnets to be used, it should be 0"),
            cidLock: zod_1.z.boolean().describe("Cid lock is the lock status of the app to be created, it should be false"),
        }),
        duration: zod_1.z.number().describe("Duration is the duration for which the balance is to be estimated, it is calculated in seconds"),
    }),
    description: "This tool is used to estimate the balance of a given project id for a given duration only for newly created apps",
});
