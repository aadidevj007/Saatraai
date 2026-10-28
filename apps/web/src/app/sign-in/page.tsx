/** Legacy alias → canonical sign-in route. */

import { permanentRedirect } from 'next/navigation';

export default function SignInRedirect() {
  permanentRedirect('/auth/sign-in');
}
