import { EndpointData, OpenApi } from "./types";
import { ensure } from "./utils/ensure";

const endpointToTypesPair = (operationId: string) => {
    const endpointType = operationId.charAt(0).toUpperCase() + operationId.slice(1);
    return [`types.${endpointType}Data`, `types.${endpointType}Response`];
};

const getUrl = (endpointId: string): string => {
    const relativeUrl = endpointId.replace(/^\//, '');
    return relativeUrl.replace(/{([^}]+)}/g, '${args.$1}');
}

const getHeader = (endpointData: EndpointData) => `/**
 * ${endpointData.get.responses[200].description}
 */`;

const getParameterlessEndpoint = (
    endpointId: string,
    endpointData: EndpointData,
    responseType: string,
): string => `
export const ${endpointData.get.operationId} = async (): Promise<${responseType}> => {
    return await client_fetch<never, ${responseType}>('${endpointId}');
};
`;

const getParameterizedEndpoint = (
    endpointId: string,
    endpointData: EndpointData,
    requestType: string,
    responseType: string,
): string => `
export const ${endpointData.get.operationId} = async (args: ${requestType}): Promise<${responseType}> => {
    return await client_fetch<${requestType}, ${responseType}>(\`${endpointId}\`, args);
};
`;

const getClientEndpoint = (pair: [string, EndpointData]) => {
    const [endpointId, endpointData] = pair;
    ensure(
        Object.keys(endpointData).length === 1 && !!endpointData.get,
        'Only a single `get` method is allowed');

    const methodData = endpointData.get;

    const [requestType, responseType] = endpointToTypesPair(methodData.operationId);
    const hasArgs = methodData.parameters && methodData.parameters.length > 0;

    const url = getUrl(endpointId);

    return getHeader(endpointData)
        + (hasArgs
            ? getParameterizedEndpoint(url, endpointData, requestType, responseType)
            : getParameterlessEndpoint(url, endpointData, responseType));
};

export const generateCustomClient = async (openApi: OpenApi): Promise<string> => {
    return `
/**
 * This file was generated by the Jikan API generator.
 * Do not modify this file manually.
 * Use methods of 'client.core.ts' to setup client.
 **/

import * as types from './types';
import { client_fetch } from './core';

${Object.entries(openApi.paths).map(getClientEndpoint).join('\n')}
    `;
};
