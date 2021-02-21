import { Component } from '@angular/core';
import { WalletService } from './wallet.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'merkle-drop';

  constructor(public wallet: WalletService) {
    wallet.connect(() => {}, () => {}, true);
  }
}
