import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { findIndustryProfile, INDUSTRY_PROFILES } from './industry-profiles';

@Injectable()
export class BusinessesService {
  constructor(private readonly database: DatabaseService) {}

  industries() {
    return INDUSTRY_PROFILES;
  }

  async create(ownerId: string, dto: CreateBusinessDto) {
    const profile = findIndustryProfile(dto.industry);
    if (!profile) throw new BadRequestException('Unknown industry profile');
    const features = dto.enabledFeatures ?? profile.recommendedFeatures;
    return this.database.business.create({
      data: {
        ownerId,
        name: dto.name.trim(),
        industry: profile.id,
        type: dto.type,
        currency: (dto.currency ?? 'TZS').toUpperCase(),
        settings: dto.settings as Prisma.InputJsonValue | undefined,
        enabledFeatures: features,
        branches: { create: { name: 'Main Branch', isMain: true } },
      },
      include: { branches: true },
    });
  }

  list(ownerId: string) {
    return this.database.business.findMany({
      where: { ownerId },
      include: { branches: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwned(ownerId: string, businessId: string) {
    const business = await this.database.business.findFirst({
      where: { id: businessId, ownerId },
      include: { branches: { where: { isActive: true } } },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async getMainBranch(ownerId: string, businessId: string) {
    await this.getOwned(ownerId, businessId);
    const branch = await this.database.branch.findFirst({
      where: { businessId, isMain: true, isActive: true },
    });
    if (!branch) throw new NotFoundException('Main Branch not found');
    return branch;
  }

  async update(ownerId: string, businessId: string, dto: UpdateBusinessDto) {
    await this.getOwned(ownerId, businessId);
    if (dto.industry && !findIndustryProfile(dto.industry)) {
      throw new BadRequestException('Unknown industry profile');
    }
    return this.database.business.update({
      where: { id: businessId },
      data: {
        ...dto,
        name: dto.name?.trim(),
        currency: dto.currency?.toUpperCase(),
        settings: dto.settings as Prisma.InputJsonValue | undefined,
      },
      include: { branches: true },
    });
  }
}
