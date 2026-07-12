import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  activePage: string;
}

export default function Sidebar({ activePage }: SidebarProps) {
  const { user } = useAuthStore();

  const menuItems = {
    main: [
      {
        name: 'Overview',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        ),
        path: '/overview'
      },
      {
        name: 'Assets',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
        ),
        path: '/assets'
      },
      {
        name: 'Scans',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
          </svg>
        ),
        path: '/scans'
      },
    ],
    analysis: [
      {
        name: 'Findings',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        ),
        path: '/findings'
      },
      {
        name: 'AI Analysis',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-1.813-5.096L2.096 14.12 7 13.307l1.813-5.096 1.813 5.096 4.904.813-4.904.813zm5.438-9.096L14.5 10l-.75-3.192L10.562 6.5 13.75 5.75 14.5 2.5l.75 3.25 3.192.75-3.192.75z" />
          </svg>
        ),
        path: '/ai-analysis'
      },
      {
        name: 'Compliance',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 0A48.536 48.536 0 0112 3m0 0c2.917 0 5.747.294 8.5.862m-21 1.402L3 20.25M3 20.25a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M3 20.25V6.108c0-1.135.845-2.098 1.976-2.192a48.424 48.424 0 001.123-.08" />
          </svg>
        ),
        path: '/compliance'
      },
    ],
    automation: [
      {
        name: 'Schedules',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
          </svg>
        ),
        path: '/schedules'
      },
      {
        name: 'Integrations',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
          </svg>
        ),
        path: '/integrations'
      },
      {
        name: 'API Keys',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        ),
        path: '/api-keys'
      },
    ],
    workspace: [
      {
        name: 'Team',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        ),
        path: '/team'
      },
      {
        name: 'Organizations',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33L12 5.508 5.25 10.33V21h13.5z" />
          </svg>
        ),
        path: '/organizations'
      },
      {
        name: 'Billing',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-19.5 8.25h2.25m3 0h2.25m-9-10.5h16.5A2.25 2.25 0 0121.75 9v9a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 014.5 6.75z" />
          </svg>
        ),
        path: '/billing'
      },
    ],
    settings: [
      {
        name: 'Settings',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        path: '/settings'
      },
      {
        name: 'Notifications',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
          </svg>
        ),
        path: '/notifications'
      },
      {
        name: 'Audit Logs',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        path: '/audit-logs'
      },
      {
        name: 'Support',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        ),
        path: '/support'
      },
    ]
  };

  return (
    <aside className="w-[240px] flex flex-col flex-shrink-0 border-r h-screen sticky top-0" style={{ backgroundColor: '#131110', borderColor: '#2A241C' }}>
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b" style={{ borderColor: '#2A241C' }}>
        <img src={logoImg} alt="CipherLens" className="w-7 h-7 object-contain" />
        <div className="flex flex-col leading-none">
          <span
            className="text-base font-bold tracking-wide font-serif"
            style={{ 
              color: '#E8D5B8',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            Cipher<span style={{ color: '#E8C98A' }}>lens</span>
          </span>
          <div className="flex justify-center -mt-1">
            <span className="text-[9px]" style={{ color: '#E8C98A' }}>✦</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 overflow-y-auto px-4 space-y-7 text-xs font-medium">
        {/* Main Category */}
        <div className="space-y-1">
          <p className="px-3 uppercase tracking-wider text-body-sm font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Main</p>
          {menuItems.main.map((item) => {
            const isActive = activePage.toLowerCase().replace(/-/g, ' ') === item.name.toLowerCase().replace(/-/g, ' ');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left relative ${
                  isActive
                    ? 'font-semibold shadow-inner'
                    : 'hover:bg-[#1E1A14]'
                } transition-colors`}
              style={isActive ? { backgroundColor: '#201C16', border: '1px solid #3D3120', color: '#E8C98A' } : { color: '#A89880' }}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                  {item.name}
                </div>
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-accent rounded" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Analysis Category */}
        <div className="space-y-1">
          <p className="px-3 uppercase tracking-wider text-body-sm font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Analysis</p>
          {menuItems.analysis.map((item) => {
            const isActive = activePage.toLowerCase().replace(/-/g, ' ') === item.name.toLowerCase().replace(/-/g, ' ');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-colors relative ${
                  isActive
                    ? 'font-semibold shadow-inner'
                    : 'hover:bg-[#1E1A14]'
                } transition-colors`}
              style={isActive ? { backgroundColor: '#201C16', border: '1px solid #3D3120', color: '#E8C98A' } : { color: '#A89880' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.name === 'Compliance' && (
                    <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none transform scale-95 mr-1">
                      Soon
                    </span>
                  )}
                </div>
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-accent rounded" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Automation Category */}
        <div className="space-y-1">
          <p className="px-3 uppercase tracking-wider text-body-sm font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Automation</p>
          {menuItems.automation.map((item) => {
            const isActive = activePage.toLowerCase().replace(/-/g, ' ') === item.name.toLowerCase().replace(/-/g, ' ');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-colors relative ${
                  isActive
                    ? 'font-semibold shadow-inner'
                    : 'hover:bg-[#1E1A14]'
                } transition-colors`}
              style={isActive ? { backgroundColor: '#201C16', border: '1px solid #3D3120', color: '#E8C98A' } : { color: '#A89880' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {(item.name === 'Integrations' || item.name === 'API Keys') && (
                    <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none transform scale-95 mr-1">
                      Soon
                    </span>
                  )}
                </div>
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-accent rounded" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Workspace Category */}
        <div className="space-y-1">
          <p className="px-3 uppercase tracking-wider text-body-sm font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Workspace</p>
          {menuItems.workspace.map((item) => {
            const isActive = activePage.toLowerCase().replace(/-/g, ' ') === item.name.toLowerCase().replace(/-/g, ' ');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-colors relative ${
                  isActive
                    ? 'font-semibold shadow-inner'
                    : 'hover:bg-[#1E1A14]'
                } transition-colors`}
              style={isActive ? { backgroundColor: '#201C16', border: '1px solid #3D3120', color: '#E8C98A' } : { color: '#A89880' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {(item.name === 'Team' || item.name === 'Organizations' || item.name === 'Billing') && (
                    <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none transform scale-95 mr-1">
                      Soon
                    </span>
                  )}
                </div>
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-accent rounded" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings Category */}
        <div className="space-y-1">
          <p className="px-3 uppercase tracking-wider text-body-sm font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Settings</p>
          {menuItems.settings.map((item) => {
            const isActive = activePage.toLowerCase().replace(/-/g, ' ') === item.name.toLowerCase().replace(/-/g, ' ');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-colors relative ${
                  isActive
                    ? 'font-semibold shadow-inner'
                    : 'hover:bg-[#1E1A14]'
                } transition-colors`}
              style={isActive ? { backgroundColor: '#201C16', border: '1px solid #3D3120', color: '#E8C98A' } : { color: '#A89880' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.name === 'Support' && (
                    <span className="bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none transform scale-95 mr-1">
                      Soon
                    </span>
                  )}
                </div>
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-accent rounded" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Footer Copyright */}
      <div className="py-2.5 text-center text-[10px] select-none border-t" style={{ borderColor: '#2A241C', color: '#6e5d48' }}>
        Arjay @ 2026 all rights reserved
      </div>

      {/* Sidebar Footer Mini Profile */}
      <div className="p-4 border-t flex items-center justify-between text-xs" style={{ borderColor: '#2A241C', color: '#7A6A54' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full border font-bold flex items-center justify-center uppercase select-none" style={{ backgroundColor: '#1E1A14', borderColor: '#3D3120', color: '#E8C98A' }}>
            {user?.fullName?.substring(0, 2) || 'JD'}
          </div>
          <div className="leading-tight text-left">
            <p className="font-semibold truncate max-w-[125px]" style={{ color: '#E8D5B8' }}>{user?.fullName || 'John Doe'}</p>
            <p className="text-body-sm truncate max-w-[125px]" style={{ color: '#7A6A54' }}>{user?.email || 'admin@acme.com'}</p>
          </div>
        </div>
        <span className="text-body-xs" style={{ color: 'var(--color-text-secondary)' }}>▼</span>
      </div>
    </aside>
  );
}
