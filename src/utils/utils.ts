
import {
    APIResponse,
    APICallReturn,
    SubnetAttributes,
    SubnetNameAndID,
    ContractApp,
    AppPayload,
} from "../types/types";

export const OWNER_THRESHOLD_API_URL = "api/v1/re-encryption";
export const ROLE_THRESHOLD_API_URL = "api/v1/re-encryption/role";
export const URSULA_CFRAGS_API_URL = "api/v1/re-encryption";

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
    T extends (...args: any) => Promise<infer R> ? R : any;

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const apiCallWrapper = async <K, T, E = Error>(
    apiCall: Promise<K>,
    format: (rowList: K) => T,
    modifyRet?: (param: APIResponse<K, E>) => APICallReturn<T, E>
): Promise<APICallReturn<T, E>> => {
    let retVal: APICallReturn<T, E>;
    try {
        const resp = await apiCall;

        if (modifyRet) {
            retVal = modifyRet({ resp, success: true });
        } else {
            retVal = {
                success: true,
                data: format(resp),
            };
        }
    } catch (err: any) {
        const error: E = err;
        if (modifyRet) {
            retVal = modifyRet({ resp: error, success: false });
        } else {
            retVal = {
                success: false,
                data: error,
            };
        }
    }

    return retVal;
};

export const parse = {
    getSubnetAttributes(values: SubnetAttributes) {
        return {
            CLUSTER_LIST_ROLE: values.CLUSTER_LIST_ROLE,
            PRICE_ROLE: values.PRICE_ROLE,
            SUBNET_ATTR_ROLE: values.SUBNET_ATTR_ROLE,
            SUBNET_DAO_ROLE: values.SUBNET_DAO_ROLE,
            WHITELIST_ROLE: values.WHITELIST_ROLE,
            dnsip: values.dnsip,
            maxClusters: values.maxClusters,
            otherAttributes: values.otherAttributes,
            publicKey: values.publicKey,
            stackFeesReqd: values.stackFeesReqd,
            subnetLocalDAO: values.subnetLocalDAO,
            subnetName: values.subnetName,
            subnetStatusListed: values.subnetStatusListed,
            subnetType: values.subnetType,
        };
    },
    getAllSubnetNamesAndIDs(values: SubnetNameAndID[]) {
        return values.map((el) => ({
            subnetName: el.subnetName,
            subnetID: el.subnetID,
        }));
    },
    getClusterAttributes(values: any) {
        return values;
    },
    getSubscribedSubnetsOfNFT({ ...values }: any) {
        return values[0]
            .filter((el: any, index: number) => values[index])
            .map((el: any) => el);
    },
    getApp(appObj: any) {
        const app = appObj.app;
        const multiplier = appObj.currentReplica.map((currentReplica: any) =>
            currentReplica.map((replica: any) => Number(replica))
        );

        let appDataCID = app.path[0];
        appDataCID = Buffer.from(appDataCID.substring(2), "hex").toString();
        appDataCID = appDataCID.substring(1);

        let modifiedDataCID = app.path[1];
        modifiedDataCID = Buffer.from(
            modifiedDataCID.substring(2),
            "hex"
        ).toString();
        modifiedDataCID = modifiedDataCID.substring(1);

        const resourceType = app.resourceType.map((resource: any) =>
            Number(resource)
        );
        const resourceCount = app.resourceCount.map((resource: any) =>
            Number(resource)
        );

        const subnetList = appObj.subnetList.map((subnet: any) =>
            Number(subnet)
        );

        return {
            appID: Number(appObj.appID),
            appName: hexToString(app.appName),
            appDataCID,
            modifiedDataCID,
            subnetList: subnetList,
            resourceType,
            resourceCount,
            cidLock: app.cidLock,
            multiplier: multiplier,
            active: app.active,
        };
    },
};

export const hexToString = (hexx: string): string => {
    let hex = hexx.toString();
    let str = "";
    for (let i = 0; i < hex.length; i += 2) {
        const val = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        if (val.charCodeAt(0) > 0) {
            str += val;
        }
    }
    return str;
};

export const getBlockTimestamp = (time: string = "60") => {
    const deadline = parseInt(time, 10);
    const currentTime = Math.floor(Date.now() / 1000 + deadline);
    return currentTime;
};

export const formatAppParams = (
    nftID: string,
    contractApp: any
): ContractApp => {
    let appPath = contractApp.path[0];
    let modPath = contractApp.path[1];
    appPath = appPath.substring(2);
    modPath = modPath.substring(2);

    const app = {
        nftID,
        appID: contractApp.appID.toString(),
        subnetList: contractApp.subnetList.map((subnetID: number) =>
            subnetID.toString()
        ),
        appName: hexToString(contractApp.appName),
        appPath,
        modPath,
        appSubnetConfig: contractApp.appSubnetConfig.map(
            (subnetConfig: any) => {
                return {
                    multiplier: subnetConfig.multiplier.map((res: any) =>
                        Number(res)
                    ),
                    resourceType: subnetConfig.resourceType.map((res: any) =>
                        Number(res)
                    ),
                    resourceCount: subnetConfig.resourceCount.map((res: any) =>
                        Number(res)
                    ),
                };
            }
        ),
        cidLock: contractApp.cidLock,
    };

    return app;
};

const searchPayload = (payload: any, replaceFunc: Function) => {
    if (!payload) return;

    const keyList = Object.keys(payload);
    let modParam: any = {};

    for (var objKey of keyList) {
        if (objKey === "attribVarList") continue;
        else if (
            objKey === "persistenceEnabled" ||
            objKey === "privateImage" ||
            objKey === "statefulSet"
        )
            continue;
        else if (typeof payload[objKey] === "string") {
            payload[objKey] = replaceFunc(payload[objKey]);
        } else if (Array.isArray(payload[objKey]) && payload[objKey].length) {
            if (typeof payload[objKey] === "string") {
                for (var i = 0; i < payload[objKey].length; i++) {
                    payload[objKey] = replaceFunc(payload[objKey]);
                }
            } else {
                for (var i = 0; i < payload[objKey].length; i++) {
                    payload[objKey] = searchPayload(
                        payload[objKey],
                        replaceFunc
                    );
                }
            }
        } else if (typeof payload[objKey] === "object") {
            payload[objKey] = searchPayload(payload[objKey], replaceFunc);
        }
    }

    return payload;
};

export const findAttribVars = (payload: any) => {
    const nameList: string[] = [];

    const checkAttrib = (field: string) => {
        const pattern = new RegExp("\\$\\{[a-zA-Z]+[a-zA-Z0-9]*\\}", "g");

        const modVarMatchList = field.match(pattern);
        if (modVarMatchList) {
            for (let i = 0; i < modVarMatchList.length; i++) {
                let varName = modVarMatchList[i];
                varName = varName.substring(
                    varName.indexOf("{") + 1,
                    varName.indexOf("}")
                );
                nameList.push(varName);
            }
        }

        return field;
    };

    searchPayload(payload, checkAttrib);

    return nameList;
};

const verifyModVariables = (
    payload: AppPayload,
    modAttribVar: { [key: string]: string }
): APICallReturn<
    string,
    {
        modVarName: string;
        message: string;
    }
> => {
    const attribVarList = payload.attribVarList;

    if (!attribVarList) {
        return {
            success: true,
            data: "",
        };
    }

    for (var attribVar of attribVarList) {
        if (
            !new RegExp(attribVar.condition).test(modAttribVar[attribVar.name])
        ) {
            return {
                success: false,
                data: {
                    modVarName: attribVar.name,
                    message: attribVar.conditionDescription || "",
                },
            };
        }
    }

    return {
        success: true,
        data: "",
    };
};

export const replaceModVariable = (
    payload: AppPayload,
    modValues: { [key: string]: string }
) => {
    if (!payload.attribVarList) return payload;

    const defaultValueMap: { [s: string]: string } = {};
    for (let i = 0; i < payload.attribVarList.length; i++) {
        const attrib = payload.attribVarList[i];
        if (attrib.defaultValue)
            defaultValueMap[attrib.name] = attrib.defaultValue;
    }
    modValues = { ...defaultValueMap, ...modValues };

    function findAndAddModVar(attrib: string) {
        const pattern = new RegExp("\\$\\{[a-zA-Z]+[a-zA-Z0-9]*\\}", "g");

        const indexList: number[] = [];
        const matchVarNameList: string[] = [];
        let nameRes = pattern.exec(attrib);
        while (nameRes) {
            indexList.push(pattern.lastIndex - nameRes[0].length);
            matchVarNameList.push(nameRes[0]);
            nameRes = pattern.exec(attrib);
        }

        if (indexList.length == 0) return attrib;

        let newAttrib = "";
        let indexScanner = 0;
        for (let i = 0; i < indexList.length; i++) {
            const curIndex = indexList[i];
            const matchVarName = matchVarNameList[i];
            const varName = matchVarName.substring(2, matchVarName.length - 1);
            newAttrib +=
                attrib.substring(indexScanner, curIndex) + modValues[varName];
            indexScanner = curIndex + matchVarName.length;
        }
        newAttrib += attrib.substring(indexScanner, attrib.length);

        return newAttrib;
    }

    return searchPayload(payload, findAndAddModVar);
};
