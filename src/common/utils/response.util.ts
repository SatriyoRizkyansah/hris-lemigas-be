import { HttpStatus } from '@nestjs/common';

export interface PaginationMeta {
  page: number;
  limit: number;
  total_datas: number;
  total_pages: number;
}

export function ok<T>(message: string, data: T) {
  return { status: HttpStatus.OK, message, data };
}

export function created<T>(message: string, data: T) {
  return { status: HttpStatus.CREATED, message, data };
}

export function deleted(message = 'Berhasil menghapus data') {
  return { status: HttpStatus.OK, message, data: null };
}

export function paginated<T>(
  message: string,
  data: T[],
  page: number,
  limit: number,
  totalDatas: number,
) {
  return {
    status: HttpStatus.OK,
    message,
    data,
    pagination: {
      page,
      limit,
      total_datas: totalDatas,
      total_pages: limit > 0 ? Math.ceil(totalDatas / limit) : 0,
    } satisfies PaginationMeta,
  };
}
