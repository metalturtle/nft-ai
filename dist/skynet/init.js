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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSkynet = void 0;
const SkyMainNodeJS_1 = __importDefault(require("@decloudlabs/skynet/lib/services/SkyMainNodeJS"));
let initializedAppCrypto;
const initializeSkyNodeCrypto = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!initializedAppCrypto) {
        const envConfig = {
            JRPC_PROVIDER: process.env.PROVIDER_RPC,
            WALLET_PRIVATE_KEY: process.env.OPERATOR_PRIVATE_KEY,
            STORAGE_API: {
                LIGHTHOUSE: {
                    LIGHTHOUSE_API_KEY: process.env.LIGHTHOUSE_API_KEY
                },
                IPFS: {
                    PROJECT_ID: process.env.IPFS_PROJECT_ID,
                    PROJECT_SECRET: process.env.IPFS_PROJECT_SECRET
                }
            }
        };
        initializedAppCrypto = new SkyMainNodeJS_1.default(envConfig);
        yield initializedAppCrypto.init(true);
    }
    return initializedAppCrypto;
});
const getSkynet = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield initializeSkyNodeCrypto();
});
exports.getSkynet = getSkynet;
