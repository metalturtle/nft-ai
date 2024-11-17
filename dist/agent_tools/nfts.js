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
exports.revokeRoleFromProjectTool = exports.grantRoleToProjectTool = exports.addBalanceToProjectTool = exports.getBalanceOfProjectTool = exports.transferProjectTool = exports.mintProjectTool = exports.getTotalProjectsTool = exports.getProjectTool = void 0;
const init_1 = require("../skynet/init");
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const ethers_1 = require("ethers");
const types_1 = require("./utils/types");
const getProjectIds = (address, start, end) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const Projects = yield getTotalNumberOfProject(address);
    if (Projects.success) {
        const ProjectCount = parseInt(Projects.data.toString());
        const ProjectIds = [];
        for (let i = start || 0; i < (end || ProjectCount); i++) {
            const Project = yield skyNode.contractService.AppNFT.tokenOfOwnerByIndex(address, i);
            if (Project) {
                ProjectIds.push(Project.toString());
            }
        }
        return {
            success: true,
            data: ProjectIds
        };
    }
    return {
        success: false,
        data: new Error("No Projects found for the given address")
    };
});
const getTotalNumberOfProject = (address) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const Projects = yield skyNode.contractService.AppNFT.balanceOf(address);
    if (Projects) {
        return {
            success: true,
            data: parseInt(Projects.toString())
        };
    }
    return {
        success: false,
        data: new Error("No Projects found for the given address")
    };
});
const transferProject = (address, ProjectId) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const tx = yield skyNode.contractService.AppNFT.transferFrom(process.env.OPERATOR_PUBLIC_KEY, address, ProjectId);
    return tx;
});
const getProjectID = (address) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const skyNode = yield (0, init_1.getSkynet)();
        const balanceOf = yield skyNode.contractService.AppNFT.balanceOf(address);
        const ProjectId = yield skyNode.contractService.AppNFT.tokenOfOwnerByIndex(address, parseInt(balanceOf) - 1);
        return ProjectId;
    }
    catch (error) {
        return 0;
    }
});
const mintProject = (address) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const tx = yield skyNode.contractService.AppNFTMinter.mint(address, {
        value: ethers_1.ethers.utils.parseUnits("200", 'gwei')
    });
    if (tx) {
        const ProjectId = yield getProjectID(address);
        console.log('Project id', ProjectId);
        return {
            success: true,
            data: ProjectId.toString()
        };
    }
    return {
        success: false,
        data: new Error("Failed to mint Project")
    };
});
const getBalanceOfProject = (projectId) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const balance = yield skyNode.dripRateManager.getBalancesForSubscription(projectId);
    return balance;
});
const addBalanceToProject = (projectId, subscriptionBalanceEstimate) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const balance = yield skyNode.dripRateManager.addSubscriptionCredit(projectId, subscriptionBalanceEstimate);
    return balance;
});
const grantRoleToProject = (projectId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const balance = yield skyNode.contractService.AppNFT.grantRole(role, projectId);
    return balance;
});
const revokeRoleFromProject = (projectId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const skyNode = yield (0, init_1.getSkynet)();
    const balance = yield skyNode.contractService.AppNFT.revokeRole(role, projectId);
    return balance;
});
// const withdrawBalanceFromProject = async (projectId: string, subscriptionBalanceEstimate: SubBalanceEstimate) => {
//     const skyNode: SkyMainNodeJS = await getSkynet();
//     const balance = await skyNode.dripRateManager.withdrawSubscriptionCredit(projectId, subscriptionBalanceEstimate);
//     return balance;
// }
// const deleteProject = async (projectId: string) => {
//     const skyNode: SkyMainNodeJS = await getSkynet();
//     const balance = await skyNode.contractService.AppNFT.transferFrom(process.env.OPERATOR_PUBLIC_KEY, projectId);
//     return balance;
// }
exports.getProjectTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ address, start, end }) {
    if (start && end) {
        return yield getProjectIds(address, start, end);
    }
    else if (start) {
        return yield getProjectIds(address, start, undefined);
    }
    else if (end) {
        return yield getProjectIds(address, undefined, end);
    }
    else {
        return yield getProjectIds(address, undefined, undefined);
    }
}), {
    name: "get_project_of_user",
    schema: zod_1.z.object({
        address: zod_1.z.string().describe("address is a public address of a crypto wallet."),
        start: zod_1.z.number().optional().describe("This number states the begining from where the projects number starts. example if the user has 10 projects, and the user wants to get only first 5, then start with 0"),
        end: zod_1.z.number().optional().describe("This number states the end till where the projects number goes. example if the user has 10 projects, and the user wants to get only first 5, then end with 5")
    }),
    description: "This tool is used to get the projects of the user wallet address",
});
exports.getTotalProjectsTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ address }) {
    return yield getTotalNumberOfProject(address);
}), {
    name: "get_total_Projects_of_user",
    schema: zod_1.z.object({
        address: zod_1.z.string().describe("address is a crypto wallet public address which is required to get the Project's of the user")
    }),
    description: "This tool is used to get the total number of Project of the user wallet address",
});
exports.mintProjectTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ address }) {
    return yield mintProject(address);
}), {
    name: "mint_Project",
    schema: zod_1.z.object({ address: zod_1.z.string().describe("address is a crypto wallet public address which is required to mint the Project") }),
    description: "This tool is used to mint or create the Project to the user wallet address and returns the Project id",
});
exports.transferProjectTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ address, ProjectId }) {
    return yield transferProject(address, ProjectId);
}), {
    name: "transfer_Project",
    schema: zod_1.z.object({
        address: zod_1.z.string().describe("address is a crypto wallet public address which is required to transfer the Project, it will be the address of the user to whom you want to transfer the Project"),
        ProjectId: zod_1.z.string().describe("ProjectId is a number converted to a string which is required to transfer the Project")
    }),
    description: "This tool is used to transfer the Project to the user wallet address",
});
exports.getBalanceOfProjectTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId }) {
    return yield getBalanceOfProject(projectId);
}), {
    name: "get_balance_of_project",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId is a number converted to a string which is required to get the balance of the project")
    }),
    description: "This tool is used to get the balance of the project",
});
exports.addBalanceToProjectTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, subscriptionBalanceEstimate }) {
    return yield addBalanceToProject(projectId, subscriptionBalanceEstimate);
}), {
    name: "add_balance_to_project",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId is a number converted to a string which is required to add the balance to the project"),
        subscriptionBalanceEstimate: zod_1.z.object({
            subnetBalances: zod_1.z.array(zod_1.z.object({
                subnetId: zod_1.z.string(),
                balance: zod_1.z.string()
            })),
            subnetList: zod_1.z.array(zod_1.z.string())
        }).describe("subscriptionBalanceEstimate is a object which is required to add the balance to the project")
    }),
    description: "This tool is used to add the balance to the project",
});
exports.grantRoleToProjectTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, role }) {
    return yield grantRoleToProject(projectId, role);
}), {
    name: "grant_role_to_project",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId is a number converted to a string which is required to grant the role to the project"),
        role: zod_1.z.nativeEnum(types_1.ROLE).describe("role is a string which is required to grant the role to the project")
    }),
    description: "This tool is used to grant the role to the project",
});
exports.revokeRoleFromProjectTool = (0, tools_1.tool)((_a) => __awaiter(void 0, [_a], void 0, function* ({ projectId, role }) {
    return yield revokeRoleFromProject(projectId, role);
}), {
    name: "revoke_role_from_project",
    schema: zod_1.z.object({
        projectId: zod_1.z.string().describe("ProjectId is a number converted to a string which is required to revoke the role from the project"),
        role: zod_1.z.nativeEnum(types_1.ROLE).describe("role is a string which is required to revoke the role from the project")
    }),
    description: "This tool is used to revoke the role from the project",
});
