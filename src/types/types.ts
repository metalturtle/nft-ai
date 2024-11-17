
import { ContractTransaction, ethers } from "ethers";
import crypto from "crypto";


export type ETHAddress = string;
export type CipherText = Uint8Array;
export type CapsuleBytes = number[];
export type ETHPublicKey = string;
export type Provider = ethers.providers.Provider;
export type CFragBytes = number[];
export type CLUSTER_WALLET_ADDRESS = string;

export type PackageMetadata = {
    version: string;
};

export type AESSecretKey = {
    key: Buffer;
    iv: Buffer;
};

export type SubnetPKMap = { [subnetID: string]: number[] };

export type CallerRole =
    | {
          roleType: "OWNER";
      }
    | {
          roleType: "ROLE";
      }
    | {
          roleType: "CLUSTER";
          subnetID: string;
          clusterID: string;
          secretKey: number[];
      }
    | {
          roleType: "OWNER_URSULA";
      };

export interface ContractAddresses {
    AppDeployment: string;
    AppNFT: string;
    AppNFTMinter: string;
    DarkMatterNFT: string;
    Stack: string;
    SubnetCluster: string;
    SubnetDAODistributor: string;
    Subscription: string;
    SubscriptionBalance: string;
    SubscriptionBalanceCalculator: string;
    SkynetWrapper: string;
    XCT: string;
    XCTMinter: string;
}

export type ContractCall<T = any> = (...args: Array<any>) => Promise<T>;
export type ContractFunc = {
    address: string;
    [funcName: string]: ContractCall | any;
};

export interface SkyContractService<C = ContractFunc, P = {}> {
    selectedAccount: ETHAddress;
    DarkMatterNFT: C;
    Stack: C;
    SubnetCluster: C;
    Subscription: C;
    XCT: C;
    AppNFT: C;
    AppNFTMinter: C;
    AppDeployment: C;
    SubscriptionBalance: C;
    SubnetDAODistributor: C;
    SubscriptionBalanceCalculator: C;
    XCTMinter: C;
    SkynetWrapper: C;
    CollectionStore: C;
    OrderPayment: C;
    Marketplace: C;
    provider: P;
    callContractRead: <K, T, E = Error>(
        apiCall: Promise<K>,
        format: (rowList: K) => T,
        modifyRet?: (param: APIResponse<K, E>) => APICallReturn<T, E>
    ) => Promise<APICallReturn<T, E>>;
    callContractWrite: (
        apiCall: Promise<ContractTransaction>
    ) => Promise<APICallReturn<string>>;
}

export interface UrsulaParams {
    ursulaNFTOwnerAPI: "api/owner";
    ursulaRoleAPI: "api/role";
    ursulaClusterAPI: "api/cluster";
    kfragCount: number;
    kfragThreshold: number;
    ursulaPKList: string[];
    ursulaURLList: string[];
}

export interface UrsulaKFrag {
    kfrag: number[];
    encryptionKey: number[];
}

export interface CreatorKey {
    creatorAddress: ETHAddress;
    publicKey: number[];
    secretKey: number[];
}

export interface ReaderKey {
    publicKey: number[];
    secretKey: number[];
    kFragList: UrsulaKFrag[];
}

export interface ContractApp {
    nftID: string;
    appID: string;
    appName: string;
    appPath: string;
    modPath: string;
    appSubnetConfig: AppSubnetConfig[];
    subnetList: string[];
    cidLock: boolean;
    nftRange?: [string, string][];
}

export interface SubnetKFragMap {
    [subnetID: string]: UrsulaKFrag[];
}

export interface SubnetKFragPathMap {
    [subnetID: string]: string;
}

export interface EncryptedPayload {
    content: number[];
    capsule: CapsuleBytes;
    cipherText: number[];
    metadata: PackageMetadata;
}

export interface EncryptedPayloadWithKeys1 {
    creator: CreatorKey;
    reader: ReaderKey;
    capsule: CapsuleBytes;
    cipherText: number[];
    content: number[];
    ursulaParams: UrsulaParams;
    subnetKFragMap: SubnetKFragMap;
}

export interface EncryptedPayloadWithKeys {
    creator: CreatorKey;
    reader: ReaderKey;
    capsule: CapsuleBytes;
    cipherText: number[];
    content: number[];
    ursulaParams: UrsulaParams;
    subnetKFragMap: SubnetKFragMap;
    creatorSKConfig: EncryptedPayloadWithKeys1;
    metadata: PackageMetadata;
}

export interface SavedEncryptedPayloadWithKeys {
    creator: {
        creatorAddress: ETHAddress;
        publicKey: number[];
        secretKey: number[];
    };
    reader: {
        publicKey: number[];
        secretKey: number[];
        kFragList: UrsulaKFrag[];
    };
    capsule: number[];
    cipherText: number[];
    ursulaParams: UrsulaParams;
    subnetKFragMap: {
        [subnetID: string]: UrsulaKFrag[];
    };
}

export interface SavedEncryptedPayload {
    capsule: number[];
    cipherText: number[];
}

export interface CachedEncryptedApp {
    appPath: string;
    encryptedApp: EncryptedPayloadWithKeys;
}

export interface CachedEncryptedAppModifier {
    appPath: string;
    encryptedAppModifier: EncryptedPayload;
}

export interface ResourceUnit {
    memory: number;
    cpu: number;
    disk?: number;
}

export interface CreateAppVolumeMounts {
    mountPath: string;
    // TODO: Consider removing 'name'. It will always be the app name.
    name: string;
}

export interface CreateAppEnvVariables {
    name: string;
    value: string;
}

export interface CreateAppImage {
    repository: string;
    tag: string;
}

export interface Port {
    containerPort: string;
    servicePort: string;
    hostURL?: {
        urlString: string;
        createMode: "CUSTOM" | "CREATE";
    };
}

export interface AttribVariableParam {
    name: string;
    condition: string;
    conditionDescription?: string;
    defaultValue?: string;
}

export type AppPayload = any;

export interface AppComputePayload {
    appName: string;
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
}

export interface CachedAppPayload {
    appPath: string;
    appPayload: AppPayload;
}

export interface CachedAppModifier {
    modPath: string;
    appModifier: AppModifier;
}

export interface AppModifier {
    modAttribVar: {
        [index: string]: any;
    };
    contractParam: {
        [subnetID: string]: AppSubnetConfig;
    };
    loggerURL: string;
}

export interface NFTLog {
    nftID: string;
    logType: "success" | "operation" | "validation" | "error";
    logID: string;
    timestamp: Date;
    appID?: string;
    appName?: string;
    operation: string;
    message: string;
}

export interface AppStatusLog extends NFTLog {
    appID: string;
    appName: string;
    logURL: string;
}

export interface SubscriptionParam {
    licenseAddress: ETHAddress;
    supportAddress: ETHAddress;
    platformAddress: ETHAddress;
    referralAddress: ETHAddress;
    createTime: number;
}

export interface APICallReturnSuccess<T> {
    success: true;
    data: T;
    statusCode?: number;
}

export interface APICallReturnError<E> {
    success: false;
    data: E;
    statusCode?: number;
}

export type APICallReturn<T, E = Error> =
    | APICallReturnSuccess<T>
    | APICallReturnError<E>;

export interface UrsulaAuth {
    userAddress: string;
    signature: string;
    message: string;
}

export interface UrsulaReturnMap {
    [index: number]: APICallReturn<CFragBytes, Error>;
}

export type APIResponse<K, E> =
    | {
          resp: K;
          success: true;
      }
    | {
          resp: E;
          success: false;
      };

export enum RESTYPE_NAME_TO_ID_MAP {
    cpuStandard = 0,
    cpuIntensive = 1,
    gpuStandard = 2,
    storage = 3,
    bandwidth = 4,
    ipfsUpload = 5,
}

export enum RESTYPE_ID_TO_NAME_MAP {
    cpuStandard = "cpuStandard",
    cpuIntensive = "cpuIntensive",
    gpuStandard = "gpuStandard",
    storage = "storage",
    bandwidth = "bandwidth",
    ipfsUpload = "ipfsUpload",
}

export type RESOURCE_CATEGORY_STRING =
    | "cpuType"
    | "storageType"
    | "bandwidthType"
    | "fileType";

export const RESOURCE_CATEGORY: Record<RESOURCE_CATEGORY_STRING, number[]> = {
    cpuType: [0, 1, 2],
    storageType: [3],
    bandwidthType: [4],
    fileType: [5],
};

export type SubnetReplicaMap = {
    [subnetId: string]: {
        [key in RESOURCE_CATEGORY_STRING]: number;
    };
};

export type resTypeAndCount<T extends RESOURCE_CATEGORY_STRING> = {
    resType: (typeof RESOURCE_CATEGORY)[T];
    resCount: number;
};

export type ResourceMap = {
    cpuType?: resTypeAndCount<"cpuType">;
    storageType?: resTypeAndCount<"storageType">;
    bandwidthType?: resTypeAndCount<"bandwidthType">;
    fileType?: resTypeAndCount<"fileType">;
};

export enum CRUD_APP_STAGE {
    STARTING_CREATE_APP = "STARTING_CREATE_APP",
    STARTING_UPDATE_APP = "STARTING_UPDATE_APP",
    STARTING_DELETE_APP = "STARTING_DELETE_APP",
    VALIDATE_CONTRACT_APP = "VALIDATE_CONTRACT_APP",
    CREATING_APP = "CREATING_APP",
    UPDATING_APP = "UPDATING_APP",
    UPDATING_CID = "UPDATING_CID",
    DELETING_APP = "DELETING_APP",
    APPROVE_BALANCE_WITHDRAW = "APPROVE_BALANCE_WITHDRAW",
    SUBSCRIBING_CREATING_APP = "SUBSCRIBING_CREATING_APP",
    SAVING_CONTRACT_APP_LOCAL = "SAVING_CONTRACT_APP_LOCAL",
    SAVING_SUBSCRIPTION_LOCAL = "SAVING_SUBSCRIPTION_LOCAL",
    DELETE_CONTRACT_APP_LOCAL = "DELETE_CONTRACT_APP_LOCAL",
    ENCRYPTING_APP = "ENCRYPTING_APP",
    SEND_APP_PAYLOAD_TO_STORAGE = "SEND_APP_PAYLOAD_TO_STORAGE",
    SAVE_APP_TO_CACHE = "SAVE_APP_TO_CACHE",
    DELETE_APP_FROM_CACHE = "DELETE_APP_FROM_CACHE",
    GET_APP_DEPLOY_STATUS = "GET_APP_DEPLOY_STATUS",
    FETCHING_BAL_FOR_SUB = "FETCHING_BAL_FOR_SUB",
    DELETE_SUCCESSFUL = "DELETE_SUCCESSFUL",
    CREATE_SUCCESSFUL = "CREATE_SUCCESSFUL",
    UPDATE_SUCCESSFUL = "UPDATE_SUCCESSFUL",
}

export interface SubnetAttributes {
    CLUSTER_LIST_ROLE: string;
    PRICE_ROLE: string;
    SUBNET_ATTR_ROLE: string;
    SUBNET_DAO_ROLE: string;
    WHITELIST_ROLE: string;
    dnsip: string;
    maxClusters: number;
    otherAttributes: any;
    publicKey: string;
    stackFeesReqd: string;
    subnetLocalDAO: string;
    subnetName: string;
    subnetStatusListed: string;
    subnetType: string;
    subnetID: string;
}

export interface SubnetNameAndID {
    subnetName: string;
    subnetID: string;
}

export type DripRateFactors = {
    licenseFactor: number;
    supportFactor: number;
    platformFactor: number;
    referralFactor: number;
    discountFactor: number;
    referralExpiryDuration: number;
    createTime: number;
    daoRate: number;
};

export type ResTypeAndCount<T extends keyof typeof RESOURCE_CATEGORY> = {
    resType: (typeof RESOURCE_CATEGORY)[T];
    resCount: number;
};

export type BalancesForSubscription = {
    subscriptionBalance: string;
    walletBalance: string;
};

export type SubBalanceEstimate = {
    subnetBalances: string[];
    subnetList: string[];
};

export type NFTSubBalance = {
    subscriptionBalance: string;
    walletBalance: string;
};

export type NFTDripRate = {
    estimDripRate: string;
    actualDripRate: string;
};

export interface NFTBundleOption {
    name: string;
    description: string;
    appContractParam?: {
        [appID: string]: ContractApp;
    };
    appModParam?: {
        [appID: string]: AppModifier;
    };
}

export interface NFTBundleParam {
    name: string;
    description: string;
    defaultOption?: string;
    optionList: NFTBundleOption[];
}

export const STORAGE_TYPE = {
    IPFS: 1,
    LIGHTHOUSE: 2,
    LIGHTS3: 3,
    AWS_S3: 4,
};

export const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";




export type AppSubnetConfig = {
    resourceType: number[];
    resourceCount: number[];
    multiplier: number[];
};

