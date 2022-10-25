import bdsCore, { httpRequest } from "@the-bds-maneger/core";

export default daemonRequest;
export function daemonRequest(host: string, socketPath: string, authKey?: string) {
  async function post(requestPath: string, body?: any) {
    return bdsCore.utils.httpRequest.getJSON({
      method: "POST",
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json", authorization: `basic ${authKey}`},
      body: body||{}
    }).catch(() => bdsCore.utils.httpRequest.getJSON({
      method: "POST",
      url: host+requestPath,
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }));
  }

  async function get(requestPath: string, body?: any) {
    return bdsCore.utils.httpRequest.getJSON({
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"}
    }).catch(() => bdsCore.utils.httpRequest.getJSON({
      url: host+requestPath,
      headers: {"Content-Type": "application/json"}
    }));
  }

  async function put(requestPath: string, body?: any) {
    return bdsCore.utils.httpRequest.getJSON({
      method: "PUT",
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }).catch(() => bdsCore.utils.httpRequest.getJSON({
      method: "PUT",
      url: host+requestPath,
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }));
  }

  async function stream(requestPath: string, stream?: any, method: httpRequest.requestOptions["method"] = "GET") {
    return bdsCore.utils.httpRequest.pipeFetch({
      stream, method,
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"}
    }).catch(() => bdsCore.utils.httpRequest.pipeFetch({
      url: host+requestPath,
      stream, method,
      headers: {"Content-Type": "application/json"}
    }));
  }

  return {post, get, put, stream};
}
