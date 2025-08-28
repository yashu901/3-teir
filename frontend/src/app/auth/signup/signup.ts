import { HttpClient } from '@angular/common/http';
import { Component, inject, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  @Input() x = '';
  http = inject(HttpClient);
  router = inject(Router);
  auth = inject(Auth);
  email = '';
  password = '';
  username = '';
  submit() {
    const data = { "username": this.username, "email": this.email, "password": this.password }
    this.auth.signup(data).subscribe({
      next: (res) => {
        console.log("yes");
        this.router.navigate(['/layout/players']);
      },
      error: (err) => {
        console.log("no")
      }
    })
  }
}
