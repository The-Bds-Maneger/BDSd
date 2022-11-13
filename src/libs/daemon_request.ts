import { httpRequest } from "@the-bds-maneger/core-utils";

export default daemonRequest;
export function daemonRequest(host: string, socketPath: string, authKey?: string) {
  async function post(requestPath: string, body?: any) {
    return httpRequest.getJSON({
      method: "POST",
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json", authorization: `basic ${authKey}`},
      body: body||{}
    }).catch(() => httpRequest.getJSON({
      method: "POST",
      url: host+requestPath,
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }));
  }

  async function get(requestPath: string, body?: any) {
    return httpRequest.getJSON({
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"}
    }).catch(() => httpRequest.getJSON({
      url: host+requestPath,
      headers: {"Content-Type": "application/json"}
    }));
  }

  async function put(requestPath: string, body?: any) {
    return httpRequest.getJSON({
      method: "PUT",
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }).catch(() => httpRequest.getJSON({
      method: "PUT",
      url: host+requestPath,
      headers: {"Content-Type": "application/json"},
      body: body||{}
    }));
  }

  async function stream(requestPath: string, stream?: any, method: httpRequest.requestOptions["method"] = "GET") {
    return httpRequest.pipeFetch({
      stream, method,
      socket: {
        socketPath,
        path: requestPath
      },
      headers: {"Content-Type": "application/json"}
    }).catch(() => httpRequest.pipeFetch({
      url: host+requestPath,
      stream, method,
      headers: {"Content-Type": "application/json"}
    }));
  }

  return {post, get, put, stream};
}
