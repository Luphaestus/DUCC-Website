import { attachDevtoolsOverlay } from '@solid-devtools/overlay'
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { lazy, onMount, onCleanup } from "solid-js";
import App from "./App";
import "../styles.scss";
import "./mos.css";
import { switchView } from "./utils/view";

// Lazy load pages for better performance
const HomePage = lazy(() => import("./pages/HomePage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ExecPage = lazy(() => import("./pages/ExecPage"));
const FilesPage = lazy(() => import("./pages/FilesPage"));
const SwimsPage = lazy(() => import("./pages/SwimsPage"));
const QuotesPage = lazy(() => import("./pages/QuotesPage"));
import ErrorPage, { UnauthorisedPage, NoInternetPage } from "./pages/ErrorPage";
const LegalPage = lazy(() => import("./pages/LegalPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SetPasswordPage = lazy(() => import("./pages/SetPasswordPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const EventExpensePage = lazy(() => import("./pages/EventExpensePage"));
const SettlementPage = lazy(() => import("./pages/SettlementPage"));

// Admin Components
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminUsersPage = lazy(() => import("./pages/admin/users/UsersPage"));
const AdminUserDetailPage = lazy(() => import("./pages/admin/users/UserDetailPage"));
const AdminEventsPage = lazy(() => import("./pages/admin/events/EventsPage"));
const AdminShareWeekPage = lazy(() => import("./pages/admin/events/ShareWeekPage"));
const AdminEventDetailPage = lazy(() => import("./pages/admin/events/EventDetailPage"));
const AdminFilesPage = lazy(() => import("./pages/admin/files/FilesPage"));
const AdminQuotesPage = lazy(() => import("./pages/admin/quotes/QuotesPage"));
const AdminTagsPage = lazy(() => import("./pages/admin/tags/TagsPage"));
const AdminTagDetailPage = lazy(() => import("./pages/admin/tags/TagDetailPage"));
const AdminRolesPage = lazy(() => import("./pages/admin/roles/RolesPage"));
const AdminRoleDetailPage = lazy(() => import("./pages/admin/roles/RoleDetailPage"));
const AdminSlidesPage = lazy(() => import("./pages/admin/slides/SlidesPage"));
const AdminGlobalsPage = lazy(() => import("./pages/admin/globals/GlobalsPage"));
const AdminKitPage = lazy(() => import("./pages/admin/kit/KitPage"));
const AdminStatsPage = lazy(() => import("./pages/admin/stats/StatsPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/DashboardPage"));

const root = document.getElementById("root");

attachDevtoolsOverlay();

if (root) {
  render(
    () => (
      <Router>
        <Route path="" component={App}>
          <Route path="/" component={HomePage} />
          <Route path="/home" component={HomePage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/events/:id" component={EventDetailPage} />
          <Route path="/event/:id" component={EventDetailPage} />
          <Route path="/events/:id/expense/:expenseId" component={EventExpensePage} />
          <Route path="/legal" component={LegalPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/signup" component={SignupPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/exec" component={ExecPage} />
          <Route path="/files" component={FilesPage} />
          <Route path="/swims" component={SwimsPage} />
          <Route path="/quotes" component={QuotesPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/set-password" component={SetPasswordPage} />
          <Route path="/settlement/:id" component={SettlementPage} />
          <Route path="/event/:id/settlement" component={SettlementPage} />
          
          <Route path="/admin" component={AdminLayout}>
             <Route path="/" component={AdminDashboardPage} />
             <Route path="/users" component={AdminUsersPage} />
             <Route path="/user/:id" component={AdminUserDetailPage} />
             <Route path="/events" component={AdminEventsPage} />
             <Route path="/events/share" component={AdminShareWeekPage} />
             <Route path="/event/:id" component={AdminEventDetailPage} />
             <Route path="/files" component={AdminFilesPage} />
             <Route path="/quotes" component={AdminQuotesPage} />
             <Route path="/tags" component={AdminTagsPage} />
             <Route path="/tag/:id" component={AdminTagDetailPage} />
             <Route path="/roles" component={AdminRolesPage} />
             <Route path="/role/:id" component={AdminRoleDetailPage} />
             <Route path="/slides" component={AdminSlidesPage} />
             <Route path="/globals" component={AdminGlobalsPage} />
             <Route path="/kit" component={AdminKitPage} />
             <Route path="/stats" component={AdminStatsPage} />
          </Route>

          <Route path="/unauthorised" component={UnauthorisedPage} />
          <Route path="/no-internet" component={NoInternetPage} />
          <Route path="/error" component={ErrorPage} />
          <Route path="/*404" component={ErrorPage} />
        </Route>
      </Router>
    ),
    root
  );
}
