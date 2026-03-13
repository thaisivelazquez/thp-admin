'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'

type Tab = 'dashboard' | 'profiles' | 'images' | 'captions'

export default function Page() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const [profiles, setProfiles] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [captions, setCaptions] = useState<any[]>([])

  // Dashboard stats
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
    // Most liked caption + image pair
    const { data: topData } = await supabase
      .from('captions')
      .select('*, images(url, image_description)')
      .order('like_count', { ascending: false })
      .limit(1)
      .single()

    if (topData) setTopCaption(topData)

    // Average likes across all captions
    const { data: avgData } = await supabase
      .from('captions')
      .select('like_count')

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
        queryParams: { prompt: 'select_account' }
      }
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
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>Login</h2>
        <button onClick={loginWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  if (isAdmin === null) {
    return <p style={{ textAlign: 'center' }}>Loading...</p>
  }

  // ── Styles ──────────────────────────────────────────────
  const bg = '#f4f6fb'
  const card = '#ffffff'
  const accent = '#4f8ef7'

  const navStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: '62px',
    backgroundColor: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  }

  const tabBtn = (tab: Tab): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    letterSpacing: '0.04em',
    backgroundColor: activeTab === tab ? accent : 'transparent',
    color: activeTab === tab ? '#fff' : '#888',
    textTransform: 'uppercase',
    transition: 'all 0.15s',
  })

  const contentStyle: React.CSSProperties = {
    padding: '32px 28px',
    backgroundColor: bg,
    minHeight: 'calc(100vh - 62px)',
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: card,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  }

  const statCardStyle: React.CSSProperties = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    color: '#aaa',
    textAlign: 'left',
    borderBottom: '1px solid #f0f0f0',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.05em',
  }

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderBottom: '1px solid #f7f7f7',
    color: '#333',
    verticalAlign: 'middle',
  }

  const paginationStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '16px',
    justifyContent: 'flex-end',
  }

  const pageBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    backgroundColor: disabled ? '#f9f9f9' : '#fff',
    color: disabled ? '#ccc' : '#333',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '15px',
    boxShadow: disabled ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
  })

  const signOutBtn: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: '999px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#fff',
    color: '#333',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const initials = user.email?.slice(0, 1).toUpperCase()

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* NAVBAR */}
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            backgroundColor: accent, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '14px', color: '#fff'
          }}>HA</div>
          <div>
            <div style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Humor Project</div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>Admin</div>
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['dashboard', 'profiles', 'images', 'captions'] as Tab[]).map((tab) => (
              <button key={tab} style={tabBtn(tab)} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: '#e74c3c', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '14px',
          }}>{initials}</div>
          <div style={{ fontSize: '13px', lineHeight: '1.3' }}>
            <div style={{ fontWeight: 600, color: '#111' }}>{user.user_metadata?.full_name ?? 'User'}</div>
            <div style={{ color: '#aaa', fontSize: '11px' }}>{user.email}</div>
          </div>
          <button style={signOutBtn} onClick={logout}>Sign Out</button>
        </div>
      </nav>

      {/* CONTENT */}
      <div style={contentStyle}>
        {!isAdmin ? (
          <p style={{ color: 'red' }}>You do not have permission to view this content.</p>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ margin: 0, color: '#111' }}>Dashboard</h2>

                {/* Stat Cards */}
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={statCardStyle}>
                    <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Likes / Caption</div>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: '#111' }}>
                      {avgLikes !== null ? avgLikes.toLocaleString() : '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>Across all captions</div>
                  </div>

                  <div style={statCardStyle}>
                    <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Caption Likes</div>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: accent }}>
                      {topCaption ? topCaption.like_count?.toLocaleString() : '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>Most liked caption</div>
                  </div>
                </div>

                {/* Most Liked Caption + Image Pair */}
                {topCaption && (
                  <div style={cardStyle}>
                    <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                      🏆 Most Liked Image + Caption Pair
                    </div>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                      {topCaption.images?.url && (
                        <img
                          src={topCaption.images.url}
                          alt=""
                          style={{ width: '180px', height: '140px', objectFit: 'cover', borderRadius: '12px' }}
                        />
                      )}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', marginBottom: '4px' }}>Caption</div>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#111' }}>{topCaption.content}</div>
                        </div>
                        {topCaption.images?.image_description && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', marginBottom: '4px' }}>Image Description</div>
                            <div style={{ fontSize: '13px', color: '#555' }}>{topCaption.images.image_description}</div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                          <span style={{
                            padding: '4px 12px', borderRadius: '999px',
                            backgroundColor: topCaption.is_public ? '#e8f5e9' : '#fce4ec',
                            color: topCaption.is_public ? '#2e7d32' : '#c62828',
                            fontSize: '12px', fontWeight: 600
                          }}>
                            {topCaption.is_public ? '🌐 Public' : '🔒 Private'}
                          </span>
                          <span style={{
                            padding: '4px 12px', borderRadius: '999px',
                            backgroundColor: '#e3f2fd', color: accent,
                            fontSize: '12px', fontWeight: 600
                          }}>
                            ❤️ {topCaption.like_count} likes
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PROFILES TAB */}
            {activeTab === 'profiles' && (
              <div style={cardStyle}>
                <h2 style={{ margin: '0 0 16px', color: '#111' }}>Profiles</h2>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {['ID', 'First Name', 'Last Name', 'Email', 'Superadmin', 'In Study', 'Matrix Admin', 'Created', 'Modified'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => (
                      <tr key={profile.id}>
                        <td style={tdStyle}>{profile.id}</td>
                        <td style={tdStyle}>{profile.first_name}</td>
                        <td style={tdStyle}>{profile.last_name}</td>
                        <td style={tdStyle}>{profile.email}</td>
                        <td style={tdStyle}>{profile.is_superadmin ? '✅' : '❌'}</td>
                        <td style={tdStyle}>{profile.is_in_study ? '✅' : '❌'}</td>
                        <td style={tdStyle}>{profile.is_matrix_admin ? '✅' : '❌'}</td>
                        <td style={tdStyle}>{new Date(profile.created_datetime_utc).toLocaleString()}</td>
                        <td style={tdStyle}>{new Date(profile.modified_datetime_utc).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={paginationStyle}>
                  <button style={pageBtn(profilePage === 1)} disabled={profilePage === 1} onClick={() => setProfilePage(p => Math.max(p - 1, 1))}>⬅️</button>
                  <span style={{ color: '#888', fontSize: '13px' }}>Page {profilePage}</span>
                  <button style={pageBtn(profiles.length < ITEMS_PER_PAGE)} disabled={profiles.length < ITEMS_PER_PAGE} onClick={() => setProfilePage(p => p + 1)}>➡️</button>
                </div>
              </div>
            )}

            {/* IMAGES TAB */}
            {activeTab === 'images' && (
              <div style={cardStyle}>
                <h2 style={{ margin: '0 0 16px', color: '#111' }}>Images</h2>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {['ID', 'Preview', 'URL', 'Actions'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {images.map((img) => (
                      <tr key={img.id}>
                        <td style={tdStyle}>{img.id}</td>
                        <td style={tdStyle}><img src={img.url} alt="" width={80} style={{ borderRadius: '8px' }} /></td>
                        <td style={tdStyle}>{img.url}</td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => deleteImage(img.id)}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', marginRight: '6px' }}
                          >Delete</button>
                          <button
                            onClick={() => updateImage(img.id, prompt('New URL?') || img.url)}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#2563eb', cursor: 'pointer' }}
                          >Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={paginationStyle}>
                  <button style={pageBtn(imagePage === 1)} disabled={imagePage === 1} onClick={() => setImagePage(p => Math.max(p - 1, 1))}>⬅️</button>
                  <span style={{ color: '#888', fontSize: '13px' }}>Page {imagePage}</span>
                  <button style={pageBtn(images.length < ITEMS_PER_PAGE)} disabled={images.length < ITEMS_PER_PAGE} onClick={() => setImagePage(p => p + 1)}>➡️</button>
                </div>
              </div>
            )}

            {/* CAPTIONS TAB */}
            {activeTab === 'captions' && (
              <div style={cardStyle}>
                <h2 style={{ margin: '0 0 16px', color: '#111' }}>Captions</h2>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {['ID', 'Image', 'Image Description', 'Caption', 'Visibility', 'Likes', 'Created'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {captions.map((caption) => (
                      <tr key={caption.id}>
                        <td style={tdStyle}>{caption.id}</td>
                        <td style={tdStyle}>
                          {caption.images?.url
                            ? <img src={caption.images.url} alt="" width={80} style={{ borderRadius: '8px' }} />
                            : '—'}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: '200px' }}>{caption.images?.image_description ?? '—'}</td>
                        <td style={{ ...tdStyle, maxWidth: '200px' }}>{caption.content}</td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                            backgroundColor: caption.is_public ? '#e8f5e9' : '#fce4ec',
                            color: caption.is_public ? '#2e7d32' : '#c62828',
                          }}>
                            {caption.is_public ? '🌐 Public' : '🔒 Private'}
                          </span>
                        </td>
                        <td style={tdStyle}>{caption.like_count}</td>
                        <td style={tdStyle}>{new Date(caption.created_datetime_utc).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={paginationStyle}>
                  <button style={pageBtn(captionPage === 1)} disabled={captionPage === 1} onClick={() => setCaptionPage(p => Math.max(p - 1, 1))}>⬅️</button>
                  <span style={{ color: '#888', fontSize: '13px' }}>Page {captionPage}</span>
                  <button style={pageBtn(captions.length < ITEMS_PER_PAGE)} disabled={captions.length < ITEMS_PER_PAGE} onClick={() => setCaptionPage(p => p + 1)}>➡️</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
