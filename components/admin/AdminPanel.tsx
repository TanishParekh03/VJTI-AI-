'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, UserPlus, Filter, MoreHorizontal, Shield,
  ChevronUp, ChevronDown, CheckCircle, Clock, AlertCircle,
  Lock, Eye, Edit, Trash2, Download, Mail
} from 'lucide-react'
import { MOCK_USERS, type User, type Role } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const roleCfg: Record<Role, { className: string; dotColor: string }> = {
  Admin: {
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40',
    dotColor: 'bg-purple-500',
  },
  Officer: {
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40',
    dotColor: 'bg-blue-500',
  },
  Faculty: {
    className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/40',
    dotColor: 'bg-teal-500',
  },
  Student: {
    className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/40',
    dotColor: 'bg-orange-500',
  },
}

const statusCfg = {
  Active: { icon: <CheckCircle className="w-3 h-3" />, className: 'text-green-600 dark:text-green-400' },
  Inactive: { icon: <Clock className="w-3 h-3" />, className: 'text-muted-foreground' },
  Pending: { icon: <AlertCircle className="w-3 h-3" />, className: 'text-amber-600 dark:text-amber-400' },
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  Admin: ['View all documents', 'Upload documents', 'Manage users', 'View analytics', 'Delete content', 'Manage system settings'],
  Officer: ['View all documents', 'Upload documents', 'View analytics', 'Export reports'],
  Faculty: ['View department documents', 'Ask questions', 'Bookmark answers', 'Export answers'],
  Student: ['View public documents', 'Ask questions', 'Bookmark answers'],
}

function UserRow({
  user,
  selected,
  onSelect,
}: {
  user: User
  selected: boolean
  onSelect: (id: string) => void
}) {
  const role = roleCfg[user.role]
  const status = statusCfg[user.status]

  return (
    <tr
      className={cn(
        'border-b border-border last:border-0 hover:bg-muted/40 transition-colors',
        selected && 'bg-primary/5'
      )}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(user.id)}
          className="rounded border-input"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {user.avatar}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', role.className)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', role.dotColor)} />
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-sm text-foreground truncate max-w-[160px]">{user.department}</p>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className={cn('flex items-center gap-1.5 text-xs font-medium', status.className)}>
          {status.icon}
          {user.status}
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <p className="text-sm text-muted-foreground">{user.lastActive}</p>
      </td>
      <td className="px-4 py-3 hidden xl:table-cell">
        <p className="text-sm font-medium text-foreground text-right">{user.queriesThisMonth.toLocaleString()}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function RolePermissionsCard({ role, permissions }: { role: Role; permissions: string[] }) {
  const cfg = roleCfg[role]
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-primary" />
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', cfg.className)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotColor)} />
          {role}
        </span>
      </div>
      <ul className="space-y-1.5">
        {permissions.map((perm) => (
          <li key={perm} className="flex items-center gap-2 text-xs">
            <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
            <span className="text-muted-foreground">{perm}</span>
          </li>
        ))}
        {(['Manage users', 'Manage system settings', 'Delete content', 'View analytics'].filter(
          (p) => !permissions.includes(p)
        )).slice(0, 2).map((perm) => (
          <li key={perm} className="flex items-center gap-2 text-xs opacity-50">
            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground line-through">{perm}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type SortKey = 'name' | 'role' | 'status' | 'lastActive' | 'queriesThisMonth'

export default function AdminPanel() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Pending'>('All')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users')

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = MOCK_USERS
    .filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.department.toLowerCase().includes(search.toLowerCase())
      const matchRole = roleFilter === 'All' || u.role === roleFilter
      const matchStatus = statusFilter === 'All' || u.status === statusFilter
      return matchSearch && matchRole && matchStatus
    })
    .sort((a, b) => {
      let av: string | number = a[sortKey] as string | number
      let bv: string | number = b[sortKey] as string | number
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1)
    })

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3 opacity-30" />
    )

  const roleSummary = (['Admin', 'Officer', 'Faculty', 'Student'] as Role[]).map((r) => ({
    role: r,
    count: MOCK_USERS.filter((u) => u.role === r).length,
  }))

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-5 max-w-7xl mx-auto space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">{MOCK_USERS.length} users · {MOCK_USERS.filter((u) => u.status === 'Active').length} active</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-3.5 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-1.5 hover:bg-muted transition">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button className="h-9 px-3.5 rounded-lg border border-border text-sm font-medium text-foreground flex items-center gap-1.5 hover:bg-muted transition">
              <Mail className="w-3.5 h-3.5" />
              Invite
            </button>
            <button className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition">
              <UserPlus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {roleSummary.map(({ role, count }, i) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setRoleFilter(roleFilter === role ? 'All' : role)}
              className={cn(
                'bg-card border rounded-xl p-4 cursor-pointer transition-all',
                roleFilter === role ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border', roleCfg[role].className)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', roleCfg[role].dotColor)} />
                  {role}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{MOCK_USERS.filter((u) => u.role === role && u.status === 'Active').length} active</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {(['users', 'permissions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'users' ? 'Users' : 'Role Permissions'}
            </button>
          ))}
        </div>

        {activeTab === 'users' ? (
          <>
            {/* Filters + search */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-input bg-background flex-1">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users by name, email, department…"
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-input bg-background text-sm text-muted-foreground">
                  <Filter className="w-3.5 h-3.5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="bg-transparent focus:outline-none text-foreground"
                  >
                    {['All', 'Active', 'Inactive', 'Pending'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
              >
                <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
                <div className="flex-1" />
                {['Deactivate', 'Change Role', 'Delete'].map((action) => (
                  <button
                    key={action}
                    onClick={() => setSelectedIds(new Set())}
                    className={cn(
                      'h-7 px-3 rounded-md text-xs font-medium transition-colors',
                      action === 'Delete'
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    )}
                  >
                    {action}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Clear
                </button>
              </motion.div>
            )}

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={() => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((u) => u.id)))}
                          className="rounded border-input"
                        />
                      </th>
                      {([
                        { key: 'name', label: 'User' },
                        { key: 'role', label: 'Role', className: 'hidden sm:table-cell' },
                        { key: 'department', label: 'Department', className: 'hidden md:table-cell' },
                        { key: 'status', label: 'Status', className: 'hidden lg:table-cell' },
                        { key: 'lastActive', label: 'Last Active', className: 'hidden lg:table-cell' },
                        { key: 'queriesThisMonth', label: 'Queries', className: 'hidden xl:table-cell text-right' },
                      ] as const).map(({ key, label, className }) => (
                        <th
                          key={key}
                          className={cn('px-4 py-2.5 text-left', className)}
                          onClick={() => toggleSort(key as SortKey)}
                        >
                          <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                            {label}
                            <SortIcon k={key as SortKey} />
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-2.5 w-24" />
                    </tr>
                  </thead>
                  <tbody className="[&_tr]:group">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                          No users match your filters
                        </td>
                      </tr>
                    ) : (
                      filtered.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          selected={selectedIds.has(user.id)}
                          onSelect={toggleSelect}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(ROLE_PERMISSIONS) as [Role, string[]][]).map(([role, perms]) => (
              <RolePermissionsCard key={role} role={role} permissions={perms} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
