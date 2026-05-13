import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  importProvidersFrom,
  provideZoneChangeDetection,
  type ApplicationConfig,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import {
  LucideAngularModule,
  Car, MapPin, Search, Calendar, User, LogIn, LogOut, UserPlus, ShieldCheck,
  Menu, X, Settings, LayoutDashboard, FileText, CreditCard, Package, Building2,
  ChevronRight, ChevronLeft, ChevronDown, Lock, Mail, KeyRound, AlertCircle,
  Loader2, Eye, EyeOff, Clock, Users, Fuel, Gauge, Tag, ArrowRight, ArrowLeft,
  Plus, Minus, Shield, ListChecks, CheckCircle2, Filter, SlidersHorizontal,
  Sparkles, Info, Pencil, Trash2, Save, Power, Wrench, History, Wallet,
  TrendingUp, BarChart3, Activity, Receipt, CalendarX,
  Globe, Phone, WifiOff,
} from 'lucide-angular';

import { jwtInterceptor } from '@core/interceptors/jwt.interceptor';
import { routes }         from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAnimations(),
    importProvidersFrom(
      LucideAngularModule.pick({
        Car, MapPin, Search, Calendar, User, LogIn, LogOut, UserPlus, ShieldCheck,
        Menu, X, Settings, LayoutDashboard, FileText, CreditCard, Package, Building2,
        ChevronRight, ChevronLeft, ChevronDown, Lock, Mail, KeyRound, AlertCircle,
        Loader2, Eye, EyeOff, Clock, Users, Fuel, Gauge, Tag, ArrowRight, ArrowLeft,
        Plus, Minus, Shield, ListChecks, CheckCircle2, Filter, SlidersHorizontal,
        Sparkles, Info, Pencil, Trash2, Save, Power, Wrench, History, Wallet,
        TrendingUp, BarChart3, Activity, Receipt, CalendarX,
        Globe, Phone, WifiOff,
      }),
    ),
  ],
};
