import { coords_dhaka } from './coords_dhaka.js';
import { coords_chattogram } from './coords_chattogram.js';
import { coords_rajshahi } from './coords_rajshahi.js';
import { coords_khulna } from './coords_khulna.js';
import { coords_barishal } from './coords_barishal.js';
import { coords_sylhet } from './coords_sylhet.js';
import { coords_rangpur } from './coords_rangpur.js';
import { coords_mymensingh } from './coords_mymensingh.js';

export const upazilaCoordinates = {
  ...coords_dhaka,
  ...coords_chattogram,
  ...coords_rajshahi,
  ...coords_khulna,
  ...coords_barishal,
  ...coords_sylhet,
  ...coords_rangpur,
  ...coords_mymensingh,
};
