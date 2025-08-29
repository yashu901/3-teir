import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Auth } from './auth/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth) as Auth;
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (auth.isLoggedIn()) { // create isLoggedIn method in your Auth service
    return true;
  } else {
    toastr.error('Please login first');
    router.navigate(['/login']); // redirect to login
    return false;
  }
};
