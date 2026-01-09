import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ChainAlias } from '../../core/types.js';
import { AddressValidator } from '../validators/index.js';

// Shared validator instance
const addressValidator = new AddressValidator();

// Type definitions for request params and body
interface AddressParams {
  address: string;
  chainAlias: ChainAlias;
}

interface CreateAddressBody {
  address: string;
  chainAlias: ChainAlias;
  label?: string;
}

interface UpdateAddressBody {
  label?: string;
}

// Service interface - defines what the handlers expect from the service layer
export interface AddressService {
  getAddressDetails(address: string, chainAlias: ChainAlias): Promise<unknown>;
  createAddress(
    address: string,
    chainAlias: ChainAlias,
    options: { label?: string }
  ): Promise<unknown>;
  updateAddress(
    address: string,
    chainAlias: ChainAlias,
    options: { label?: string }
  ): Promise<unknown>;
  monitorAddress(address: string, chainAlias: ChainAlias): Promise<unknown>;
  unmonitorAddress(address: string, chainAlias: ChainAlias): Promise<unknown>;
}

/**
 * Get details for a specific address
 */
export async function getAddressDetails(
  request: FastifyRequest,
  reply: FastifyReply,
  addressService: AddressService
): Promise<void> {
  const { address, chainAlias } = request.params as AddressParams;

  // Validate address
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    return reply.status(400).send({ error: validation.error });
  }

  // Call service with original address string (service layer still expects strings)
  const result = await addressService.getAddressDetails(address, chainAlias);
  reply.send(result);
}

/**
 * Create a new address record
 */
export async function createAddress(
  request: FastifyRequest,
  reply: FastifyReply,
  addressService: AddressService
): Promise<void> {
  const { address, chainAlias, label } = request.body as CreateAddressBody;

  // Validate address
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    return reply.status(400).send({ error: validation.error });
  }

  // Call service with original address string
  const result = await addressService.createAddress(address, chainAlias, { label });
  reply.send(result);
}

/**
 * Update an existing address record
 */
export async function updateAddress(
  request: FastifyRequest,
  reply: FastifyReply,
  addressService: AddressService
): Promise<void> {
  const { address, chainAlias } = request.params as AddressParams;
  const { label } = request.body as UpdateAddressBody;

  // Validate address
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    return reply.status(400).send({ error: validation.error });
  }

  // Call service with original address string
  const result = await addressService.updateAddress(address, chainAlias, { label });
  reply.send(result);
}

/**
 * Start monitoring an address for activity
 */
export async function monitorAddress(
  request: FastifyRequest,
  reply: FastifyReply,
  addressService: AddressService
): Promise<void> {
  const { address, chainAlias } = request.params as AddressParams;

  // Validate address
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    return reply.status(400).send({ error: validation.error });
  }

  // Call service with original address string
  const result = await addressService.monitorAddress(address, chainAlias);
  reply.send(result);
}

/**
 * Stop monitoring an address
 */
export async function unmonitorAddressHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  addressService: AddressService
): Promise<void> {
  const { address, chainAlias } = request.params as AddressParams;

  // Validate address
  const validation = addressValidator.validate(address, chainAlias);
  if (!validation.isValid) {
    return reply.status(400).send({ error: validation.error });
  }

  // Call service with original address string
  const result = await addressService.unmonitorAddress(address, chainAlias);
  reply.send(result);
}
