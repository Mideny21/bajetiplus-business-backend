import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  findById(id: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { id } });
  }
  findByIdentifier(identifier: string): Promise<User | null> {
    return this.database.user.findFirst({
      where: { OR: [{ email: identifier }, { mobile: identifier }] },
    });
  }
  findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { firebaseUid } });
  }
  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.database.user.create({ data });
  }
  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.database.user.update({ where: { id }, data });
  }
}
