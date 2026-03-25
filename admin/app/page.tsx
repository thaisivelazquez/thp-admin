'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import './styling.css'

type Tab = 'dashboard' | 'profiles' | 'images' | 'captions'

export default function Page() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const [profiles, setProfiles] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [captions, setCaptions] = useState<any[]>([])

  const [topCaption, setTopCaption] = useState<any>(null)
  const [avgLikes, setAvgLikes] = useState<number | null>(null)

  const [imagePage, setImagePage] = useState(1)
  const [profilePage, setProfilePage] = useState(1)
  const [captionPage, setCaptionPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const fetchAll = async (currentImagePage: number, currentProfilePage: number, currentCaptionPage: number) => {
    const imageFrom = (currentImagePage - 1) * ITEMS_PER_PAGE
    const imageTo = imageFrom + ITEMS_PER_PAGE - 1
    const profileFrom = (currentProfilePage - 1) * ITEMS_PER_PAGE
    const profileTo = profileFrom + ITEMS_PER_PAGE - 1
    const captionFrom = (currentCaptionPage - 1) * ITEMS_PER_PAGE
    const captionTo = captionFrom + ITEMS_PER_PAGE - 1

    const [profilesRes, imagesRes, captionsRes] = await Promise.all([
      supabase.from('profiles').select('*').range(profileFrom, profileTo),
      supabase.from('images').select('*').range(imageFrom, imageTo),
      supabase.from('captions').select('*, images(url, image_description)').range(captionFrom, captionTo),
    ])

    if (!profilesRes.error) setProfiles(profilesRes.data)
    if (!imagesRes.error) setImages(imagesRes.data)
    if (!captionsRes.error) setCaptions(captionsRes.data)
  }

  const fetchDashboardStats = async () => {
    const { data: topData } = await supabase
      .from('captions')
      .select('*, images(url, image_description)')
      .order('like_count', { ascending: false })
      .limit(1)
      .single()

    if (topData) setTopCaption(topData)

    const { data: avgData } = await supabase.from('captions').select('like_count')

    if (avgData && avgData.length > 0) {
      const total = avgData.reduce((sum: number, c: any) => sum + (c.like_count ?? 0), 0)
      setAvgLikes(Math.round(total / avgData.length))
    }
  }

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      setUser(user)

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_superadmin')
          .eq('id', user.id)
          .single()

        if (!error) {
          const admin = data?.is_superadmin ?? false
          setIsAdmin(admin)
          if (admin) {
            await fetchAll(1, 1, 1)
            await fetchDashboardStats()
          }
        } else {
          setIsAdmin(false)
        }
      }
    }

    loadUser()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchAll(imagePage, profilePage, captionPage)
  }, [imagePage, profilePage, captionPage])

  const refreshImages = async () => {
    const from = (imagePage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    const { data, error } = await supabase.from('images').select('*').range(from, to)
    if (!error) setImages(data)
  }

  const updateImage = async (id: string, newUrl: string) => {
    const { error } = await supabase.from('images').update({ url: newUrl }).eq('id', id)
    if (!error) refreshImages()
  }

  const deleteImage = async (id: string) => {
    const { error } = await supabase.from('images').delete().eq('id', id)
    if (!error) refreshImages()
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(null)
    setProfiles([])
    setImages([])
    setCaptions([])
    setTopCaption(null)
    setAvgLikes(null)
  }

  if (!user) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo-wrapper">
            <div className="login-logo-tile">HA</div>
            <div>
              <div className="login-brand-label">Humor Project</div>
              <h1 className="login-title">
                Login to Admin Dashboard<br />
                <span className="login-title-accent">for the Humor Project</span>
              </h1>
            </div>
          </div>

          <div className="login-divider" />

          <p className="login-description">
            Sign in with your Google account to access the admin panel.
            Only authorized administrators can proceed.
          </p>

          <button onClick={loginWithGoogle} className="login-google-btn">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.2l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.6 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Sign in with Google
          </button>

          <p className="login-footer-note">Access is restricted to verified admins only.</p>
        </div>
      </div>
    )
  }

  if (isAdmin === null) {
    return <p className="loading">Loading...</p>
  }

  if (isAdmin === false) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo-wrapper">
            <div className="login-logo-tile">HA</div>
            <div>
              <div className="login-brand-label">Humor Project</div>
              <h1 className="login-title">
                Access Denied
              </h1>
            </div>
          </div>

          <div className="login-divider" />

          <p className="login-description">
            Your account <strong>{user.email}</strong> does not have admin access.
            Please contact an administrator if you believe this is a mistake.
          </p>

          <button onClick={logout} className="login-google-btn">
            Sign Out
          </button>

          <p className="login-footer-note">Access is restricted to verified admins only.</p>
        </div>
      </div>
    )
  }


  if (isAdmin === null) {
    return <p className="loading">Loading...</p>
  }

  const initials = user.email?.slice(0, 1).toUpperCase()

  return (
    <div className="wrapper">
      {/* NAVBAR */}
      <nav className="nav">
        <div className="nav-left">
          <div className="nav-logo">HA</div>
          <div>
            <div className="nav-brand-label">Humor Project</div>
            <div className="nav-brand-name">Admin</div>
          </div>
        </div>

        {isAdmin && (
          <div className="nav-tabs">
            {(['dashboard', 'profiles', 'images', 'captions'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="nav-right">
          <div className="nav-avatar">{initials}</div>
          <div className="nav-user-info">
            <div className="nav-user-name">{user.user_metadata?.full_name ?? 'User'}</div>
            <div className="nav-user-email">{user.email}</div>
          </div>
          <button className="sign-out-btn" onClick={logout}>Sign Out</button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="content">
        {!isAdmin ? (
          <p className="no-permission">You do not have permission to view this content.</p>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="dashboard">
                <h2 className="dashboard-title">Dashboard</h2>

                <div className="stat-cards-row">
                  <div className="stat-card">
                    <div className="stat-label">Average Likes / Caption</div>
                    <div className="stat-value">
                      {avgLikes !== null ? avgLikes.toLocaleString() : '\u2014'}
                    </div>
                    <div className="stat-sub">Across all captions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Top Caption Likes</div>
                    <div className="stat-value-accent">
                      {topCaption ? topCaption.like_count?.toLocaleString() : '\u2014'}
                    </div>
                    <div className="stat-sub">Most liked caption</div>
                  </div>
                </div>

                {topCaption && (
                  <div className="card">
                    <div className="top-caption-header">
                      Most Liked Image + Caption Pair
                    </div>
                    <div className="top-caption-body">
                      {topCaption.images?.url && (
                        <img src={topCaption.images.url} alt="" className="top-caption-img" />
                      )}
                      <div className="top-caption-details">
                        <div>
                          <div className="top-caption-field-label">Caption</div>
                          <div className="top-caption-content">{topCaption.content}</div>
                        </div>
                        {topCaption.images?.image_description && (
                          <div>
                            <div className="top-caption-field-label">Image Description</div>
                            <div className="top-caption-desc">{topCaption.images.image_description}</div>
                          </div>
                        )}
                        <div className="top-caption-badges">
                          <span className={topCaption.is_public ? 'badge-public' : 'badge-private'}>
                            {topCaption.is_public ? 'Public' : 'Private'}
                          </span>
                          <span className="badge-likes">{topCaption.like_count} likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PROFILES TAB */}
            {activeTab === 'profiles' && (
              <div className="card">
                <h2 className="section-title">Profiles</h2>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        {['ID', 'First Name', 'Last Name', 'Email', 'Superadmin', 'In Study', 'Matrix Admin', 'Created', 'Modified'].map(h => (
                          <th key={h} className="th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((profile) => (
                        <tr key={profile.id}>
                          <td className="td">{profile.id}</td>
                          <td className="td">{profile.first_name}</td>
                          <td className="td">{profile.last_name}</td>
                          <td className="td">{profile.email}</td>
                          <td className="td">{profile.is_superadmin ? 'Yes' : 'No'}</td>
                          <td className="td">{profile.is_in_study ? 'Yes' : 'No'}</td>
                          <td className="td">{profile.is_matrix_admin ? 'Yes' : 'No'}</td>
                          <td className="td">{new Date(profile.created_datetime_utc).toLocaleString()}</td>
                          <td className="td">{new Date(profile.modified_datetime_utc).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <button className="page-btn" disabled={profilePage === 1} onClick={() => setProfilePage(p => Math.max(p - 1, 1))}>&#8592;</button>
                  <span className="page-label">Page {profilePage}</span>
                  <button className="page-btn" disabled={profiles.length < ITEMS_PER_PAGE} onClick={() => setProfilePage(p => p + 1)}>&#8594;</button>
                </div>
              </div>
            )}

            {/* IMAGES TAB */}
            {activeTab === 'images' && (
              <div className="card">
                <h2 className="section-title">Images</h2>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        {['ID', 'Preview', 'URL', 'Actions'].map(h => (
                          <th key={h} className="th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {images.map((img) => (
                        <tr key={img.id}>
                          <td className="td">{img.id}</td>
                          <td className="td"><img src={img.url} alt="" width={80} className="table-img" /></td>
                          <td className="td">{img.url}</td>
                          <td className="td">
                            <button className="btn-delete" onClick={() => deleteImage(img.id)}>Delete</button>
                            <button className="btn-edit" onClick={() => updateImage(img.id, prompt('New URL?') || img.url)}>Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <button className="page-btn" disabled={imagePage === 1} onClick={() => setImagePage(p => Math.max(p - 1, 1))}>&#8592;</button>
                  <span className="page-label">Page {imagePage}</span>
                  <button className="page-btn" disabled={images.length < ITEMS_PER_PAGE} onClick={() => setImagePage(p => p + 1)}>&#8594;</button>
                </div>
              </div>
            )}

            {/* CAPTIONS TAB */}
            {activeTab === 'captions' && (
              <div className="card">
                <h2 className="section-title">Captions</h2>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        {['ID', 'Image', 'Image Description', 'Caption', 'Visibility', 'Likes', 'Created'].map(h => (
                          <th key={h} className="th">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {captions.map((caption) => (
                        <tr key={caption.id}>
                          <td className="td">{caption.id}</td>
                          <td className="td">
                            {caption.images?.url
                              ? <img src={caption.images.url} alt="" width={80} className="table-img" />
                              : '\u2014'}
                          </td>
                          <td className="td-truncate">{caption.images?.image_description ?? '\u2014'}</td>
                          <td className="td-truncate">{caption.content}</td>
                          <td className="td">
                            <span className={caption.is_public ? 'visibility-public' : 'visibility-private'}>
                              {caption.is_public ? 'Public' : 'Private'}
                            </span>
                          </td>
                          <td className="td">{caption.like_count}</td>
                          <td className="td">{new Date(caption.created_datetime_utc).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <button className="page-btn" disabled={captionPage === 1} onClick={() => setCaptionPage(p => Math.max(p - 1, 1))}>&#8592;</button>
                  <span className="page-label">Page {captionPage}</span>
                  <button className="page-btn" disabled={captions.length < ITEMS_PER_PAGE} onClick={() => setCaptionPage(p => p + 1)}>&#8594;</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
