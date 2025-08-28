import { Component, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../auth';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  @Input() x = '';
  http = inject(HttpClient);
  router = inject(Router);
  auth = inject(Auth);
  toaser = inject(ToastrService)
  email = '';
  password = '';
  submit() {
    const userDetails = { email: this.email, password: this.password };
    this.auth.login(userDetails).subscribe({
      next: (res) => {
        this.toaser.success('Login successful!');
        this.router.navigate(['/layout/teams'])
        console.log("yes");
      },
      error: (err) => {
        this.toaser.error('Login failed');
      }
    })
  }
}