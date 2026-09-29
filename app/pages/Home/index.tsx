import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  status: "Active" | "Inactive";
  avatar: string;
  lastActive: string;
};

type Project = {
  id: number;
  name: string;
  description: string;
  status: "Active" | "Completed" | "Paused";
  progress: number;
  members: number;
  updatedAt: string;
};

type Activity = {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
};

const users: User[] = [
  {
    id: 1,
    name: "Naxrul Ahmed",
    email: "naxrul@example.com",
    role: "Admin",
    status: "Active",
    avatar: "NA",
    lastActive: "2 minutes ago",
  },
  {
    id: 2,
    name: "Sarah Wilson",
    email: "sarah@example.com",
    role: "Editor",
    status: "Active",
    avatar: "SW",
    lastActive: "5 minutes ago",
  },
  {
    id: 3,
    name: "Michael Chen",
    email: "michael@example.com",
    role: "Editor",
    status: "Active",
    avatar: "MC",
    lastActive: "12 minutes ago",
  },
  {
    id: 4,
    name: "David Miller",
    email: "david@example.com",
    role: "Viewer",
    status: "Inactive",
    avatar: "DM",
    lastActive: "2 hours ago",
  },
  {
    id: 5,
    name: "Emily Johnson",
    email: "emily@example.com",
    role: "Viewer",
    status: "Active",
    avatar: "EJ",
    lastActive: "18 minutes ago",
  },
  {
    id: 6,
    name: "Robert Brown",
    email: "robert@example.com",
    role: "Editor",
    status: "Inactive",
    avatar: "RB",
    lastActive: "1 day ago",
  },
];

const projects: Project[] = [
  {
    id: 1,
    name: "Xanpack",
    description: "Next generation JavaScript bundler",
    status: "Active",
    progress: 78,
    members: 6,
    updatedAt: "10 minutes ago",
  },
  {
    id: 2,
    name: "Xanix",
    description: "Express-first React framework",
    status: "Active",
    progress: 64,
    members: 8,
    updatedAt: "25 minutes ago",
  },
  {
    id: 3,
    name: "React Rock",
    description: "Lightweight React state management",
    status: "Completed",
    progress: 100,
    members: 3,
    updatedAt: "2 hours ago",
  },
  {
    id: 4,
    name: "Xansql",
    description: "Modern TypeScript ORM",
    status: "Paused",
    progress: 31,
    members: 4,
    updatedAt: "Yesterday",
  },
];

const activities: Activity[] = [
  {
    id: 1,
    user: "Naxrul Ahmed",
    action: "created",
    target: "Xanpack",
    time: "2 minutes ago",
  },
  {
    id: 2,
    user: "Sarah Wilson",
    action: "updated",
    target: "Dashboard",
    time: "8 minutes ago",
  },
  {
    id: 3,
    user: "Michael Chen",
    action: "completed",
    target: "Authentication",
    time: "15 minutes ago",
  },
  {
    id: 4,
    user: "Emily Johnson",
    action: "commented on",
    target: "API Documentation",
    time: "30 minutes ago",
  },
  {
    id: 5,
    user: "David Miller",
    action: "joined",
    target: "Development Team",
    time: "1 hour ago",
  },
];

const ThemeContext = createContext<{
  dark: boolean;
  toggle: () => void;
}>({
  dark: false,
  toggle: () => {},
});

function useTheme() {
  return useContext(ThemeContext);
}

function Badge({
  children,
  type = "default",
}: {
  children: React.ReactNode;
  type?: "default" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

function Avatar({
  name,
  size = "medium",
}: {
  name: string;
  size?: "small" | "medium" | "large";
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return <div className={`avatar avatar-${size}`}>{initials}</div>;
}

function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}) {
  const positive = change.startsWith("+");

  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-icon">{icon}</div>

        <button className="icon-button">
          <span>•••</span>
        </button>
      </div>

      <div className="stat-title">{title}</div>

      <div className="stat-value">{value}</div>

      <div className={`stat-change ${positive ? "positive" : "negative"}`}>
        {change}
        <span> vs last month</span>
      </div>
    </div>
  );
}

function Sidebar({
  active,
  setActive,
}: {
  active: string;
  setActive: (value: string) => void;
}) {
  const { dark, toggle } = useTheme();

  const items = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "analytics", label: "Analytics", icon: "◒" },
    { id: "projects", label: "Projects", icon: "▣" },
    { id: "team", label: "Team", icon: "♙" },
    { id: "tasks", label: "Tasks", icon: "✓" },
    { id: "calendar", label: "Calendar", icon: "□" },
    { id: "messages", label: "Messages", icon: "✉" },
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">X</div>
        <span>Dashboard</span>
      </div>

      <div className="workspace">
        <div className="workspace-avatar">D</div>

        <div className="workspace-info">
          <strong>Devnax Workspace</strong>
          <span>Free Plan</span>
        </div>

        <span>⌄</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">MAIN MENU</div>

        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => setActive(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>

            {item.id === "messages" && (
              <span className="notification-count">4</span>
            )}
          </button>
        ))}

        <div className="nav-label">WORKSPACE</div>

        <button className="nav-item">
          <span className="nav-icon">⚙</span>
          Settings
        </button>

        <button className="nav-item">
          <span className="nav-icon">?</span>
          Help Center
        </button>
      </nav>

      <div className="sidebar-bottom">
        <button className="theme-button" onClick={toggle}>
          <span>{dark ? "☀" : "☾"}</span>
          {dark ? "Light mode" : "Dark mode"}
        </button>

        <div className="user-profile">
          <Avatar name="Naxrul Ahmed" />

          <div>
            <strong>Naxrul Ahmed</strong>
            <span>Administrator</span>
          </div>

          <span>•••</span>
        </div>
      </div>
    </aside>
  );
}

function Header({
  title,
  onSearch,
}: {
  title: string;
  onSearch: (value: string) => void;
}) {
  const [query, setQuery] = useState("");

  function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;

    setQuery(value);
    onSearch(value);
  }

  return (
    <header className="header">
      <div>
        <div className="breadcrumb">
          Dashboard <span>/</span> {title}
        </div>

        <h1>{title}</h1>
      </div>

      <div className="header-actions">
        <div className="search">
          <span>⌕</span>

          <input
            value={query}
            onChange={handleSearch}
            placeholder="Search anything..."
          />

          <kbd>⌘ K</kbd>
        </div>

        <button className="header-button">
          <span>♧</span>
        </button>

        <button className="header-button notification">
          <span>♢</span>
          <i />
        </button>

        <Avatar name="Naxrul Ahmed" />
      </div>
    </header>
  );
}

function Chart() {
  const bars = [42, 58, 45, 72, 62, 82, 68, 91, 76, 88, 70, 96];

  return (
    <div className="chart">
      <div className="chart-y-axis">
        <span>100K</span>
        <span>75K</span>
        <span>50K</span>
        <span>25K</span>
        <span>0</span>
      </div>

      <div className="chart-content">
        <div className="chart-grid">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="bars">
          {bars.map((height, index) => (
            <div className="bar-wrapper" key={index}>
              <div
                className="bar"
                style={{
                  height: `${height}%`,
                }}
              />

              <span>
                {
                  [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ][index]
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueCard() {
  const [period, setPeriod] = useState("12 months");

  return (
    <section className="card revenue-card">
      <div className="card-header">
        <div>
          <h2>Revenue Overview</h2>
          <p>Monthly revenue performance</p>
        </div>

        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option>12 months</option>
          <option>6 months</option>
          <option>3 months</option>
          <option>This year</option>
        </select>
      </div>

      <div className="revenue-total">
        <strong>$128,540</strong>
        <Badge type="success">+18.4%</Badge>
      </div>

      <Chart />
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusType =
    project.status === "Active"
      ? "success"
      : project.status === "Paused"
        ? "warning"
        : "info";

  return (
    <div className="project-card">
      <div className="project-card-top">
        <div className="project-icon">{project.name.charAt(0)}</div>

        <button className="icon-button">•••</button>
      </div>

      <h3>{project.name}</h3>

      <p>{project.description}</p>

      <div className="project-meta">
        <Badge type={statusType}>{project.status}</Badge>

        <span>{project.members} members</span>
      </div>

      <div className="progress-header">
        <span>Progress</span>
        <strong>{project.progress}%</strong>
      </div>

      <div className="progress">
        <div
          style={{
            width: `${project.progress}%`,
          }}
        />
      </div>

      <div className="project-footer">
        <div className="mini-avatars">
          {Array.from({
            length: Math.min(project.members, 4),
          }).map((_, index) => (
            <Avatar
              key={index}
              name={users[index]?.name ?? "User"}
              size="small"
            />
          ))}

          {project.members > 4 && (
            <span className="more-members">+{project.members - 4}</span>
          )}
        </div>

        <span>{project.updatedAt}</span>
      </div>
    </div>
  );
}

function Projects() {
  const [filter, setFilter] = useState("All");

  const filteredProjects = useMemo(() => {
    if (filter === "All") {
      return projects;
    }

    return projects.filter((project) => project.status === filter);
  }, [filter]);

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Projects</h2>
          <p>Track your active projects and progress.</p>
        </div>

        <button className="primary-button">+ New Project</button>
      </div>

      <div className="filter-tabs">
        {["All", "Active", "Completed", "Paused"].map((item) => (
          <button
            key={item}
            className={filter === item ? "selected" : ""}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="projects-grid">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}

function ActivityFeed() {
  return (
    <section className="card activity-card">
      <div className="card-header">
        <div>
          <h2>Recent Activity</h2>
          <p>Latest workspace activity.</p>
        </div>

        <button className="text-button">View all</button>
      </div>

      <div className="activity-list">
        {activities.map((activity) => (
          <div className="activity" key={activity.id}>
            <Avatar name={activity.user} />

            <div className="activity-content">
              <div>
                <strong>{activity.user}</strong> {activity.action}{" "}
                <a href="#">{activity.target}</a>
              </div>

              <span>{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamTable() {
  const [selected, setSelected] = useState<number[]>([]);

  function toggleUser(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  const allSelected = selected.length === users.length;

  function toggleAll() {
    setSelected(allSelected ? [] : users.map((user) => user.id));
  }

  return (
    <section className="card team-card">
      <div className="card-header">
        <div>
          <h2>Team Members</h2>
          <p>Manage workspace members and permissions.</p>
        </div>

        <button className="primary-button">+ Invite Member</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last active</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                  />
                </td>

                <td>
                  <div className="member">
                    <Avatar name={user.name} />

                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </td>

                <td>
                  <Badge>{user.role}</Badge>
                </td>

                <td>
                  <Badge
                    type={user.status === "Active" ? "success" : "default"}
                  >
                    <span className="status-dot" />
                    {user.status}
                  </Badge>
                </td>

                <td>{user.lastActive}</td>

                <td>
                  <button className="icon-button">•••</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Tasks() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Implement module graph",
      done: true,
    },
    {
      id: 2,
      title: "Add tree shaking",
      done: true,
    },
    {
      id: 3,
      title: "Implement code splitting",
      done: false,
    },
    {
      id: 4,
      title: "Build production minifier",
      done: false,
    },
    {
      id: 5,
      title: "Write integration tests",
      done: false,
    },
  ]);

  function toggleTask(id: number) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              done: !task.done,
            }
          : task,
      ),
    );
  }

  return (
    <section className="card tasks-card">
      <div className="card-header">
        <div>
          <h2>Tasks</h2>
          <p>Your current development tasks.</p>
        </div>

        <button className="primary-button">+ Add Task</button>
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <label className="task" key={task.id}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
            />

            <span className={task.done ? "task-done" : ""}>{task.title}</span>

            <small>{task.done ? "Completed" : "Pending"}</small>
          </label>
        ))}
      </div>
    </section>
  );
}

function NotificationPanel({
  open,
  close,
}: {
  open: boolean;
  close: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>Notifications</h3>

        <button onClick={close}>×</button>
      </div>

      {[
        "Your project was updated",
        "Sarah invited you to a project",
        "Build completed successfully",
        "You have 3 new messages",
      ].map((notification, index) => (
        <div className="notification-item" key={index}>
          <div className="notification-icon">!</div>

          <div>
            <strong>{notification}</strong>
            <span>{index + 2} minutes ago</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({ open, close }: { open: boolean; close: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!open) {
    return null;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    console.log({
      name,
      description,
    });

    close();
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Create Project</h2>
            <p>Add a new project to your workspace.</p>
          </div>

          <button onClick={close}>×</button>
        </div>

        <form onSubmit={submit}>
          <label>
            Project name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My awesome project"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe your project..."
              rows={5}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={close}>
              Cancel
            </button>

            <button type="submit" className="primary-button">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardContent({ active }: { active: string }) {
  if (active === "team") {
    return <TeamTable />;
  }

  if (active === "tasks") {
    return <Tasks />;
  }

  if (active === "projects") {
    return <Projects />;
  }

  return (
    <>
      <div className="stats-grid">
        <StatCard
          title="Total Revenue"
          value="$128,540"
          change="+18.4%"
          icon="$"
        />

        <StatCard title="Total Users" value="24,892" change="+12.8%" icon="♙" />

        <StatCard title="Active Projects" value="48" change="+7.2%" icon="▣" />

        <StatCard
          title="Conversion Rate"
          value="6.84%"
          change="-2.4%"
          icon="%"
        />
      </div>

      <div className="main-grid">
        <RevenueCard />

        <ActivityFeed />
      </div>

      <Projects />

      <TeamTable />
    </>
  );
}

export default function Dashboard() {
  const [dark, setDark] = useState(false);
  const [active, setActive] = useState("overview");
  const [search, setSearch] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.title = `Dashboard - ${
      active.charAt(0).toUpperCase() + active.slice(1)
    }`;
  }, [active]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        const input = document.querySelector<HTMLInputElement>(".search input");

        input?.focus();
      }

      if (event.key === "Escape") {
        setNotificationOpen(false);
        setModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, []);

  const themeValue = useMemo(
    () => ({
      dark,
      toggle: () => setDark((value) => !value),
    }),
    [dark],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <div className={`app ${dark ? "dark" : ""}`}>
        <Sidebar active={active} setActive={setActive} />

        <main className="main">
          <Header
            title={active.charAt(0).toUpperCase() + active.slice(1)}
            onSearch={setSearch}
          />

          {search && (
            <div className="search-result">
              Searching for: <strong>{search}</strong>
            </div>
          )}

          <div className="content">
            <div className="page-actions">
              <div>
                <h2>
                  Good morning, Naxrul
                  <span> 👋</span>
                </h2>

                <p>Here is what is happening with your workspace today.</p>
              </div>

              <div className="action-buttons">
                <button
                  className="secondary-button"
                  onClick={() => setNotificationOpen(true)}
                >
                  Notifications
                </button>

                <button
                  className="primary-button"
                  onClick={() => setModalOpen(true)}
                >
                  + Create Project
                </button>
              </div>
            </div>

            <DashboardContent active={active} />
          </div>
        </main>

        <NotificationPanel
          open={notificationOpen}
          close={() => setNotificationOpen(false)}
        />

        <Modal open={modalOpen} close={() => setModalOpen(false)} />
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f6f7fb;
          color: #172033;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          display: flex;
          background: #f6f7fb;
        }

        .sidebar {
          width: 260px;
          position: fixed;
          inset: 0 auto 0 0;
          display: flex;
          flex-direction: column;
          background: #fff;
          border-right: 1px solid #e8eaf0;
          padding: 24px 16px;
          z-index: 20;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 11px;
          font-size: 18px;
          font-weight: 800;
          padding: 0 10px 26px;
        }

        .logo-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #111827;
          color: white;
          font-weight: 800;
        }

        .workspace {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          margin-bottom: 24px;
          border: 1px solid #e8eaf0;
          border-radius: 12px;
        }

        .workspace-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 700;
        }

        .workspace-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .workspace-info strong {
          font-size: 12px;
        }

        .workspace-info span {
          color: #8991a5;
          font-size: 11px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-label {
          color: #a0a6b5;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          padding: 14px 12px 7px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px 12px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #687086;
          text-align: left;
          font-size: 13px;
        }

        .nav-item:hover,
        .nav-item.active {
          background: #f0f1ff;
          color: #4f46e5;
        }

        .nav-icon {
          width: 20px;
          text-align: center;
          font-size: 16px;
        }

        .notification-count {
          margin-left: auto;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #4f46e5;
          color: white;
          font-size: 10px;
          font-weight: 700;
        }

        .sidebar-bottom {
          margin-top: auto;
        }

        .theme-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 0;
          background: transparent;
          padding: 11px 12px;
          color: #687086;
          text-align: left;
          border-radius: 9px;
        }

        .theme-button:hover {
          background: #f5f6fa;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 6px 0;
          margin-top: 10px;
          border-top: 1px solid #eceef3;
        }

        .user-profile > div {
          flex: 1;
          min-width: 0;
        }

        .user-profile strong,
        .user-profile span {
          display: block;
        }

        .user-profile strong {
          font-size: 12px;
        }

        .user-profile span {
          margin-top: 2px;
          color: #9299a9;
          font-size: 10px;
        }

        .main {
          min-width: 0;
          flex: 1;
          margin-left: 260px;
        }

        .header {
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          background: #fff;
          border-bottom: 1px solid #e8eaf0;
        }

        .breadcrumb {
          color: #9aa1b2;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .breadcrumb span {
          padding: 0 5px;
        }

        .header h1 {
          margin: 0;
          font-size: 20px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search {
          width: 270px;
          height: 38px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          background: #f7f8fa;
          border: 1px solid #e8eaf0;
          border-radius: 8px;
        }

        .search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 12px;
        }

        .search kbd {
          white-space: nowrap;
          padding: 3px 5px;
          border: 1px solid #dfe2e8;
          border-radius: 4px;
          color: #9299a9;
          font-size: 9px;
        }

        .header-button,
        .icon-button {
          border: 0;
          background: transparent;
          color: #737b8e;
        }

        .header-button {
          width: 36px;
          height: 36px;
          border: 1px solid #e7e9ef;
          border-radius: 8px;
        }

        .notification {
          position: relative;
        }

        .notification i {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ef4444;
        }

        .content {
          padding: 30px 34px 60px;
        }

        .page-actions {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 26px;
        }

        .page-actions h2 {
          margin: 0 0 6px;
          font-size: 21px;
        }

        .page-actions p {
          margin: 0;
          color: #8991a5;
          font-size: 12px;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
        }

        .primary-button,
        .secondary-button {
          height: 38px;
          padding: 0 15px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .primary-button {
          border: 1px solid #4f46e5;
          background: #4f46e5;
          color: white;
        }

        .secondary-button {
          border: 1px solid #e1e4ea;
          background: white;
          color: #4c5569;
        }

        .text-button {
          border: 0;
          background: transparent;
          color: #4f46e5;
          font-size: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 18px;
        }

        .stat-card,
        .card {
          background: #fff;
          border: 1px solid #e8eaf0;
          border-radius: 12px;
        }

        .stat-card {
          padding: 18px;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #f0f1ff;
          color: #4f46e5;
          font-weight: 700;
        }

        .stat-title {
          color: #8b92a3;
          font-size: 11px;
          margin-top: 17px;
        }

        .stat-value {
          font-size: 25px;
          font-weight: 750;
          margin-top: 5px;
        }

        .stat-change {
          margin-top: 8px;
          font-size: 10px;
          font-weight: 700;
        }

        .stat-change span {
          color: #a0a6b4;
          font-weight: 400;
        }

        .positive {
          color: #16a34a;
        }

        .negative {
          color: #ef4444;
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .card {
          padding: 20px;
          margin-bottom: 18px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 15px;
        }

        .card-header p {
          margin: 5px 0 0;
          color: #939aaa;
          font-size: 11px;
        }

        .card-header select {
          border: 1px solid #e3e6ec;
          border-radius: 7px;
          background: white;
          padding: 7px 10px;
          color: #687086;
          font-size: 11px;
        }

        .revenue-total {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 17px;
        }

        .revenue-total strong {
          font-size: 27px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border-radius: 5px;
          background: #f1f3f6;
          color: #626a7c;
          font-size: 10px;
          font-weight: 600;
        }

        .badge-success {
          background: #eaf8ef;
          color: #16803c;
        }

        .badge-warning {
          background: #fff5df;
          color: #ad7200;
        }

        .badge-danger {
          background: #fff0f0;
          color: #d53030;
        }

        .badge-info {
          background: #edf4ff;
          color: #3167bd;
        }

        .chart {
          height: 255px;
          display: flex;
          margin-top: 20px;
        }

        .chart-y-axis {
          width: 45px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-bottom: 23px;
          color: #a0a6b3;
          font-size: 9px;
        }

        .chart-content {
          position: relative;
          flex: 1;
        }

        .chart-grid {
          position: absolute;
          inset: 0 0 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .chart-grid span {
          display: block;
          border-top: 1px dashed #e7e9ee;
        }

        .bars {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 0 5px;
        }

        .bar-wrapper {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
        }

        .bar {
          width: 65%;
          min-height: 8px;
          border-radius: 5px 5px 2px 2px;
          background: #6d65ee;
        }

        .bar-wrapper span {
          color: #9ba2b1;
          font-size: 9px;
        }

        .activity-list {
          margin-top: 20px;
        }

        .activity {
          display: flex;
          gap: 10px;
          padding: 13px 0;
          border-bottom: 1px solid #f0f1f4;
        }

        .activity:last-child {
          border-bottom: 0;
        }

        .activity-content {
          min-width: 0;
          font-size: 11px;
          line-height: 1.5;
        }

        .activity-content strong {
          font-weight: 700;
        }

        .activity-content a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
        }

        .activity-content > span {
          display: block;
          color: #a0a6b4;
          font-size: 9px;
          margin-top: 3px;
        }

        .avatar {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e9e7ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 700;
        }

        .avatar-small {
          width: 25px;
          height: 25px;
          font-size: 8px;
          border: 2px solid white;
        }

        .avatar-large {
          width: 44px;
          height: 44px;
          font-size: 13px;
        }

        .filter-tabs {
          display: flex;
          gap: 4px;
          margin: 20px 0;
          border-bottom: 1px solid #eceef2;
        }

        .filter-tabs button {
          padding: 8px 13px;
          border: 0;
          background: transparent;
          color: #8991a2;
          font-size: 11px;
          border-bottom: 2px solid transparent;
        }

        .filter-tabs button.selected {
          color: #4f46e5;
          border-bottom-color: #4f46e5;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .project-card {
          padding: 16px;
          border: 1px solid #e8eaf0;
          border-radius: 10px;
        }

        .project-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .project-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #f0f1ff;
          color: #4f46e5;
          font-weight: 800;
        }

        .project-card h3 {
          margin: 13px 0 4px;
          font-size: 13px;
        }

        .project-card > p {
          min-height: 32px;
          margin: 0;
          color: #9299aa;
          font-size: 10px;
          line-height: 1.5;
        }

        .project-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          color: #9299aa;
          font-size: 9px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-top: 17px;
          color: #9299aa;
          font-size: 9px;
        }

        .progress-header strong {
          color: #525b70;
        }

        .progress {
          height: 5px;
          overflow: hidden;
          margin-top: 7px;
          border-radius: 99px;
          background: #eceef3;
        }

        .progress div {
          height: 100%;
          border-radius: inherit;
          background: #6259eb;
        }

        .project-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 16px;
          color: #a0a6b4;
          font-size: 8px;
        }

        .mini-avatars {
          display: flex;
          align-items: center;
        }

        .mini-avatars .avatar + .avatar {
          margin-left: -6px;
        }

        .more-members {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          margin-left: -5px;
          border: 2px solid white;
          border-radius: 50%;
          background: #f0f1f5;
          color: #7b8292;
          font-size: 8px;
        }

        .table-wrapper {
          overflow-x: auto;
          margin-top: 18px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          padding: 11px 10px;
          color: #9ca2b0;
          font-size: 9px;
          font-weight: 700;
          text-align: left;
          background: #fafbfc;
          border-bottom: 1px solid #e9ebef;
        }

        td {
          padding: 12px 10px;
          border-bottom: 1px solid #eef0f3;
          color: #697184;
          font-size: 10px;
        }

        tbody tr:hover {
          background: #fafaff;
        }

        .member {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .member > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .member strong {
          color: #30384a;
          font-size: 11px;
        }

        .member span {
          color: #9ba1af;
          font-size: 9px;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

        .task-list {
          margin-top: 18px;
        }

        .task {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 5px;
          border-bottom: 1px solid #edf0f3;
          font-size: 12px;
        }

        .task span {
          flex: 1;
        }

        .task small {
          color: #999fae;
          font-size: 9px;
        }

        .task-done {
          color: #9ca2af;
          text-decoration: line-through;
        }

        .notification-panel {
          position: fixed;
          top: 72px;
          right: 25px;
          z-index: 100;
          width: 330px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          box-shadow: 0 20px 60px rgba(0,0,0,.15);
        }

        .notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 17px;
          border-bottom: 1px solid #eceef2;
        }

        .notification-header h3 {
          margin: 0;
          font-size: 14px;
        }

        .notification-header button,
        .modal-header button {
          border: 0;
          background: transparent;
          color: #8c93a3;
          font-size: 20px;
        }

        .notification-item {
          display: flex;
          gap: 10px;
          padding: 15px;
          border-bottom: 1px solid #f0f1f4;
        }

        .notification-icon {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 800;
        }

        .notification-item strong,
        .notification-item span {
          display: block;
        }

        .notification-item strong {
          font-size: 10px;
        }

        .notification-item span {
          margin-top: 3px;
          color: #999fae;
          font-size: 9px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, .45);
        }

        .modal {
          width: min(500px, 100%);
          border-radius: 14px;
          background: white;
          box-shadow: 0 30px 80px rgba(0,0,0,.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          padding: 22px;
          border-bottom: 1px solid #eceef2;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 16px;
        }

        .modal-header p {
          margin: 5px 0 0;
          color: #9299a8;
          font-size: 10px;
        }

        .modal form {
          padding: 22px;
        }

        .modal label {
          display: block;
          margin-bottom: 17px;
          color: #525b6e;
          font-size: 11px;
          font-weight: 600;
        }

        .modal input,
        .modal textarea {
          display: block;
          width: 100%;
          margin-top: 7px;
          padding: 10px 11px;
          outline: 0;
          border: 1px solid #dfe2e8;
          border-radius: 7px;
          resize: vertical;
          font-size: 11px;
        }

        .modal input:focus,
        .modal textarea:focus {
          border-color: #6259eb;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 22px;
        }

        .search-result {
          margin: 15px 34px 0;
          padding: 10px 13px;
          border: 1px solid #e2e4ef;
          border-radius: 8px;
          background: white;
          color: #71798b;
          font-size: 11px;
        }

        .dark {
          background: #10131a;
          color: #eef1f7;
        }

        .dark .sidebar,
        .dark .header,
        .dark .card,
        .dark .stat-card,
        .dark .secondary-button,
        .dark .search,
        .dark .notification-panel,
        .dark .modal {
          background: #181c24;
          border-color: #282e39;
        }

        .dark .app {
          background: #10131a;
        }

        .dark .nav-item,
        .dark .theme-button {
          color: #9ba3b5;
        }

        .dark .nav-item:hover,
        .dark .nav-item.active {
          background: #25203d;
          color: #a69fff;
        }

        .dark .header h1,
        .dark .page-actions h2,
        .dark .card-header h2,
        .dark .stat-value,
        .dark .project-card h3,
        .dark .member strong,
        .dark .modal-header h2 {
          color: #f1f3f7;
        }

        .dark .search input,
        .dark .card-header select,
        .dark .modal input,
        .dark .modal textarea {
          color: #e8ebf2;
          background: #11151c;
          border-color: #303643;
        }

        .dark th {
          background: #13171e;
        }

        .dark td,
        .dark th,
        .dark .activity,
        .dark .task,
        .dark .notification-item {
          border-color: #282e39;
        }

        @media (max-width: 1200px) {
          .projects-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 75px;
            padding: 20px 10px;
          }

          .logo span,
          .workspace-info,
          .workspace > span,
          .nav-item span:not(.nav-icon),
          .theme-button,
          .user-profile > div,
          .user-profile > span {
            display: none;
          }

          .workspace {
            justify-content: center;
          }

          .nav-item {
            justify-content: center;
          }

          .main {
            margin-left: 75px;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .header {
            padding: 0 16px;
          }

          .header .search {
            display: none;
          }

          .content {
            padding: 20px 16px;
          }

          .page-actions {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .projects-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            width: 100%;
          }

          .action-buttons button {
            flex: 1;
          }
        }
      `}</style>
    </ThemeContext.Provider>
  );
}
