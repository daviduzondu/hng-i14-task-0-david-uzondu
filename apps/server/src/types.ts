export interface GenderizeResponse {
 count: number;
 gender: 'male' | 'female' | null;
 name: string;
 probability: number;
}

export interface SuccessResponse {
 status: 'success';
 data: Omit<GenderizeResponse, 'count'> & {
  sample_size: number;
  is_confident: boolean;
  processed_at: string
 }
}

export interface ErrorResponse {
 status: 'error',
 message: string
}