import { coreApiClient } from '../client';
import {
  AddressNotFoundError,
  CoreApiError,
  CoreApiForbiddenError,
  CoreApiSessionExpiredError,
  CoreApiUnauthorizedError,
  CoreApiValidationError,
} from '../errors';
import type {
  AddressByChainListParams,
  AddressListParams,
  ChainAlias,
  CreateAddressInput,
  CreateHdAddressInput,
  Ecosystem,
  GenerateAddressInput,
  HdAddressListParams,
  UpdateAddressInput,
  ValidateAddressInput,
} from '../types';

export class AddressRepository {
  constructor(private readonly token: string) {}

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async list(vaultId: string, params?: AddressListParams) {
    const { data, response } = await coreApiClient.GET(
      '/v2/vaults/{vaultId}/addresses/',
      {
        headers: this.headers,
        params: { path: { vaultId }, query: params },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async listByChain(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    params?: AddressByChainListParams
  ) {
    const { data, response } = await coreApiClient.GET(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias }, query: params },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async get(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string
  ) {
    const { data, response } = await coreApiClient.GET(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias, address } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new AddressNotFoundError(address);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async create(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    body: CreateAddressInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async update(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string,
    body: UpdateAddressInput
  ) {
    const { data, response } = await coreApiClient.PATCH(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias, address } },
        body,
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new AddressNotFoundError(address);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async startMonitoring(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/monitoring',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias, address } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new AddressNotFoundError(address);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async stopMonitoring(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    address: string
  ) {
    const { data, response } = await coreApiClient.DELETE(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/address/{address}/monitoring',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias, address } },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new AddressNotFoundError(address);
      }
      throw this.handleError(response);
    }

    return data!;
  }

  async createHdAddress(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    body?: CreateHdAddressInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/hd-addresses',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async listHdAddresses(
    vaultId: string,
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    params?: HdAddressListParams
  ) {
    const { data, response } = await coreApiClient.GET(
      '/v2/vaults/{vaultId}/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/hd-addresses',
      {
        headers: this.headers,
        params: { path: { vaultId, ecosystem, chainAlias }, query: params },
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async generate(vaultId: string, body: GenerateAddressInput) {
    const { data, response } = await coreApiClient.POST(
      '/v2/vaults/{vaultId}/addresses/',
      {
        headers: this.headers,
        params: { path: { vaultId } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  async validate(
    ecosystem: Ecosystem,
    chainAlias: ChainAlias,
    body: ValidateAddressInput
  ) {
    const { data, response } = await coreApiClient.POST(
      '/v2/addresses/ecosystem/{ecosystem}/chain/{chainAlias}/validate',
      {
        headers: this.headers,
        params: { path: { ecosystem, chainAlias } },
        body,
      }
    );

    if (!response.ok) {
      throw this.handleError(response);
    }

    return data!;
  }

  private handleError(response: Response): never {
    const { status, statusText } = response;

    if (status === 401) {
      throw new CoreApiUnauthorizedError(statusText);
    }
    if (status === 403) {
      throw new CoreApiForbiddenError(statusText);
    }
    if (status === 419) {
      throw new CoreApiSessionExpiredError(statusText);
    }
    if (status === 400) {
      throw new CoreApiValidationError(statusText);
    }

    throw new CoreApiError(statusText, 'REQUEST_FAILED', status);
  }
}
