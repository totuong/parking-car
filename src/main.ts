import { createApp } from "vue";
import PrimeVue from "primevue/config";
import Aura from '@primeuix/themes/aura';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button'
import './assets/main.css';
import App from './App.vue'
const app = createApp(App);

app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});

app.component('InputText', InputText);
app.component('Button', Button);
app.mount('#app'); 