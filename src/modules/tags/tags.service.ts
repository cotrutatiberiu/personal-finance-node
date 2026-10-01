import type { UserDetails } from "#common/types/UserDetails.js";
import * as tagsSchema from "./tags.schema.js";
import { prisma } from "#db/client.js";
import { toPaginatedResponse } from "#common/types/PaginatedResponse.js";
import { Prisma } from "#generated/prisma/client.js";
import { SortOrder } from "#common/schemas/pagination.schema.js";
import { DuplicateResource, ResourceNotFound } from "#common/errors.js";

function mapTagWriteError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") throw new DuplicateResource("Tag");
    if (err.code === "P2025") throw new ResourceNotFound("Tag");
  }
  throw err;
}

export async function create(
  userDetails: UserDetails,
  payload: tagsSchema.CreateTagRequest,
) {
  try {
    return await prisma.tags.create({
      data: { user_id: userDetails.id, name: payload.name },
    });
  } catch (err) {
    mapTagWriteError(err);
  }
}

export async function getById(userDetails: UserDetails, tagId: number) {
  const tag = await prisma.tags.findFirst({
    where: { user_id: userDetails.id, id: tagId },
  });
  if (!tag) throw new ResourceNotFound("Tag");

  return tag;
}

export async function getTags(
  userDetails: UserDetails,
  pageSize: number,
  page: number,
  orderBy: tagsSchema.TagOrderBy,
  order: SortOrder,
) {
  const where: Prisma.tagsWhereInput = { user_id: userDetails.id };

  const [tags, total] = await Promise.all([
    prisma.tags.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: [{ [orderBy]: order }, { id: order }],
    }),
    prisma.tags.count({ where }),
  ]);

  return toPaginatedResponse(tags, total, page, pageSize);
}

export async function rename(
  userDetails: UserDetails,
  tagId: number,
  payload: tagsSchema.UpdateTagRequest,
) {
  try {
    return await prisma.tags.update({
      where: { id: tagId, user_id: userDetails.id },
      data: { name: payload.name, updated_at: new Date() },
    });
  } catch (err) {
    mapTagWriteError(err);
  }
}

export async function deleteById(userDetails: UserDetails, tagId: number) {
  try {
    await prisma.tags.delete({
      where: { id: tagId, user_id: userDetails.id },
    });
  } catch (err) {
    mapTagWriteError(err);
  }
}
