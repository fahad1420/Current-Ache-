import { toBn } from './banglaDigits';

/**
 * Returns human-readable relative time in natural Bengali
 */
export const getBanglaRelativeTime = (dateString) => {
  if (!dateString) return 'অজানা সময়';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return 'এইমাত্র';
  if (diffInSeconds < 25) return 'এইমাত্র';
  if (diffInSeconds < 60) return `${toBn(diffInSeconds)} সেকেন্ড আগে`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${toBn(diffInMinutes)} মিনিট আগে`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${toBn(diffInHours)} ঘণ্টা আগে`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'গতকাল';
  if (diffInDays < 30) return `${toBn(diffInDays)} দিন আগে`;

  return date.toLocaleDateString('bn-BD', {
    month: 'short',
    day: 'numeric'
  });
};
