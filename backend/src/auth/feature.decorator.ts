import { SetMetadata } from '@nestjs/common';

export const FEATURES_KEY = 'required_features';

export const RequiresFeature = (...features: string[]) =>
  SetMetadata(FEATURES_KEY, features);

