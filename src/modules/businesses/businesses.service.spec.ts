/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BusinessType } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { BusinessesService } from './businesses.service';
import { INDUSTRY_PROFILES } from './industry-profiles';

describe('BusinessesService', () => {
  it('defines all V1 industry presets on the shared architecture', () => {
    expect(INDUSTRY_PROFILES).toHaveLength(13);
    expect(
      INDUSTRY_PROFILES.find((profile) => profile.id === 'repair-maintenance'),
    ).toMatchObject({
      recommendedBusinessType: BusinessType.HYBRID,
      recommendedFeatures: expect.arrayContaining([
        'services',
        'products',
        'inventory',
      ]),
    });
  });

  it('creates a Main Branch and uses recommended features by default', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'business-id' });
    const database = { business: { create } } as unknown as DatabaseService;
    const service = new BusinessesService(database);

    await service.create('user-id', {
      name: 'Ray Shop',
      industry: 'clothing-fashion',
      type: BusinessType.PRODUCT,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'user-id',
          enabledFeatures: expect.arrayContaining([
            'products',
            'inventory',
            'variants',
          ]),
          branches: { create: { name: 'Main Branch', isMain: true } },
        }),
      }),
    );
  });
});
