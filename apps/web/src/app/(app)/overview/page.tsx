/** Legacy alias → canonical dashboard route. */

import { permanentRedirect } from 'next/navigation';

export default function OverviewRedirect() {
  permanentRedirect('/dashboard');
}
