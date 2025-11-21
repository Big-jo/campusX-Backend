import crypto from 'crypto';

export class Gravatar {
  static generate(email: string, size: number = 200, defaultImage: string = 'identicon'): string {
    const hash = crypto
      .createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex');

    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
  }

  static generateWithOptions(
    email: string,
    options: {
      size?: number;
      defaultImage?: 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank';
      rating?: 'g' | 'pg' | 'r' | 'x';
      forceDefault?: boolean;
    } = {}
  ): string {
    const { size = 200, defaultImage = 'identicon', rating = 'g', forceDefault = false } = options;

    const hash = crypto
      .createHash('md5')
      .update(email.toLowerCase().trim())
      .digest('hex');

    const params = new URLSearchParams({
      s: size.toString(),
      d: defaultImage,
      r: rating,
    });

    if (forceDefault) {
      params.set('f', 'y');
    }

    return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
  }
}
