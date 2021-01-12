import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClaimComponent } from './claim/claim.component';
import { CreateComponent } from './create/create.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent
  },
  {
    path: 'create',
    component: CreateComponent
  },
  {
    path: 'claim/:rootIPFSHash',
    component: ClaimComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
