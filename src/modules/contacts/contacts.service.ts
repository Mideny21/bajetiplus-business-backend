import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly businesses: BusinessesService,
  ) {}
  private data(dto: CreateContactDto | UpdateContactDto) {
    return {
      ...dto,
      name: dto.name?.trim(),
      email: dto.email?.trim().toLowerCase(),
    };
  }
  async createCustomer(
    userId: string,
    businessId: string,
    dto: CreateContactDto,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.customer.create({
      data: {
        businessId,
        name: dto.name.trim(),
        phone: dto.phone,
        email: dto.email?.trim().toLowerCase(),
        notes: dto.notes,
      },
    });
  }
  async listCustomers(
    userId: string,
    businessId: string,
    includeArchived = false,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.customer.findMany({
      where: { businessId, ...(includeArchived ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }
  async customer(userId: string, businessId: string, id: string) {
    await this.businesses.getOwned(userId, businessId);
    const value = await this.database.customer.findFirst({
      where: { id, businessId },
      include: {
        sales: { include: { items: true }, orderBy: { soldAt: 'desc' } },
      },
    });
    if (!value) throw new NotFoundException('Customer not found');
    return value;
  }
  async updateCustomer(
    userId: string,
    businessId: string,
    id: string,
    dto: UpdateContactDto,
  ) {
    await this.customer(userId, businessId, id);
    return this.database.customer.update({
      where: { id },
      data: this.data(dto),
    });
  }
  async archiveCustomer(userId: string, businessId: string, id: string) {
    await this.customer(userId, businessId, id);
    return this.database.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
  async createSupplier(
    userId: string,
    businessId: string,
    dto: CreateContactDto,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.supplier.create({
      data: {
        businessId,
        name: dto.name.trim(),
        phone: dto.phone,
        email: dto.email?.trim().toLowerCase(),
        notes: dto.notes,
      },
    });
  }
  async listSuppliers(
    userId: string,
    businessId: string,
    includeArchived = false,
  ) {
    await this.businesses.getOwned(userId, businessId);
    return this.database.supplier.findMany({
      where: { businessId, ...(includeArchived ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }
  async supplier(userId: string, businessId: string, id: string) {
    await this.businesses.getOwned(userId, businessId);
    const value = await this.database.supplier.findFirst({
      where: { id, businessId },
      include: {
        purchases: {
          include: { items: true },
          orderBy: { purchasedAt: 'desc' },
        },
      },
    });
    if (!value) throw new NotFoundException('Supplier not found');
    return value;
  }
  async updateSupplier(
    userId: string,
    businessId: string,
    id: string,
    dto: UpdateContactDto,
  ) {
    await this.supplier(userId, businessId, id);
    return this.database.supplier.update({
      where: { id },
      data: this.data(dto),
    });
  }
  async archiveSupplier(userId: string, businessId: string, id: string) {
    await this.supplier(userId, businessId, id);
    return this.database.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
