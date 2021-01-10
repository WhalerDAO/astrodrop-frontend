import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClaimComponent } from './claim/claim.component';
import { CreateComponent } from './create/create.component';

const routes: Routes = [
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
