import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ChevronDown, ChevronUp, Edit2, Heart, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { useFoodiesStore } from "../../../store/useFoodiesStore";
import api from "../../../utils/api";

const { width: W, height: SCREEN_H } = Dimensions.get("window");
const H_PAD = Math.round(W * 0.045);

const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
})();

interface ClientUser { _id:string; firstName:string; lastName:string; email:string; avatar?:string; }

/* ════════════════════════════════════════════════════════════ */
export default function CoachFoodiesScreen() {
  const router = useRouter();
  const {
    favoriteMeals, loadingFavorites, fetchFavorites, updateFavorites, deleteFavoriteMeal,
    shopping, loadingShopping, fetchShopping, addShopping, updateShopping, deleteShopping,
  } = useFoodiesStore();

  /* ── clients ── */
  const [clients, setClients]         = useState<ClientUser[]>([]);
  const [filtered, setFiltered]       = useState<ClientUser[]>([]);
  const [search, setSearch]           = useState("");
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selected, setSelected]       = useState<ClientUser|null>(null);
  const [showList, setShowList]       = useState(true);

  /* ── active section ── */
  type Section = "favorites"|"shopping";
  const [section, setSection]         = useState<Section>("favorites");

  /* ── favourites ── */
  const [showAddFav, setShowAddFav]   = useState(false);
  const [newFav, setNewFav]           = useState("");
  const [editFavOld, setEditFavOld]   = useState<string|null>(null);
  const [editFavNew, setEditFavNew]   = useState("");
  const [favSaving, setFavSaving]     = useState(false);

  /* ── shopping ── */
  const [showShopModal, setShowShopModal] = useState(false);
  const [editShopItem, setEditShopItem]   = useState<any>(null);
  const [shopName, setShopName]           = useState("");
  const [shopQty, setShopQty]             = useState("");
  const [shopPrice, setShopPrice]         = useState("");
  const [shopDate, setShopDate]           = useState(TODAY_ISO);
  const [shopSaving, setShopSaving]       = useState(false);

  /* ── fetch clients ── */
  useEffect(() => {
    (async () => {
      try { const res = await api.get("/users/clients"); setClients(res.data); setFiltered(res.data); }
      catch { console.warn("Failed to load clients"); }
      finally { setClientsLoading(false); }
    })();
  }, []);

  /* ── search filter ── */
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(clients); return; }
    setFiltered(clients.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)));
  }, [search, clients]);

  /* ── select client → load their data ── */
  const selectClient = async (c: ClientUser) => {
    setSelected(c); setShowList(false); setSearch("");
    await Promise.all([fetchFavorites(c._id), fetchShopping(c._id)]);
  };

  const avatarUri = (c:ClientUser) => c.avatar ? (c.avatar.startsWith("http")?c.avatar:`http://sculptbyashton.com:5000${c.avatar}`) : null;
  const initials  = (c:ClientUser) => `${c.firstName?.[0]??""}${c.lastName?.[0]??""}`.toUpperCase();

  /* ════ FAVOURITES ════ */
  const addFav = async () => {
    if (!newFav.trim()||!selected) return Alert.alert("Required","Enter a meal name.");
    setFavSaving(true);
    try { await updateFavorites([...favoriteMeals,newFav.trim()],selected._id); setShowAddFav(false); setNewFav(""); }
    catch { Alert.alert("Error","Failed."); }
    finally { setFavSaving(false); }
  };
  const editFav = async () => {
    if (!editFavNew.trim()||!editFavOld||!selected) return;
    setFavSaving(true);
    try { await updateFavorites(favoriteMeals.map(m=>m===editFavOld?editFavNew.trim():m),selected._id); setEditFavOld(null); }
    catch { Alert.alert("Error","Failed."); }
    finally { setFavSaving(false); }
  };
  const deleteFav = (meal:string) =>
    Alert.alert("Remove",`Remove "${meal}" from ${selected?.firstName}'s favourites?`,[
      {text:"Cancel",style:"cancel"},
      {text:"Remove",style:"destructive",onPress:()=>deleteFavoriteMeal(meal,selected?._id)},
    ]);

  /* ════ SHOPPING ════ */
  const openAddShop = () => { setEditShopItem(null);setShopName("");setShopQty("");setShopPrice("");setShopDate(TODAY_ISO);setShowShopModal(true); };
  const openEditShop = (it:any) => { setEditShopItem(it);setShopName(it.item);setShopQty(it.quantity??"");setShopPrice(it.price!=null?String(it.price):"");setShopDate(it.date);setShowShopModal(true); };
  const saveShop = async () => {
    if (!shopName.trim()||!selected) return Alert.alert("Required","Enter an item name.");
    setShopSaving(true);
    try {
      const payload:any={item:shopName.trim(),quantity:shopQty.trim()||undefined,price:shopPrice?parseFloat(shopPrice):undefined,date:shopDate.trim()||TODAY_ISO,clientId:selected._id};
      if (editShopItem) await updateShopping(editShopItem._id,payload);
      else await addShopping(payload);
      setShowShopModal(false);
    } catch { Alert.alert("Error","Failed."); }
    finally { setShopSaving(false); }
  };
  const deleteShop = (id:string) =>
    Alert.alert("Delete","Remove this item?",[
      {text:"Cancel",style:"cancel"},
      {text:"Delete",style:"destructive",onPress:()=>deleteShopping(id)},
    ]);

  const shopByDate = shopping.reduce((acc:Record<string,typeof shopping>,it)=>{ (acc[it.date]||(acc[it.date]=[])).push(it);return acc;},{});
  const sortedDates = Object.keys(shopByDate).sort((a,b)=>b.localeCompare(a));

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <LinearGradient colors={["#000000", "#555555", "#ffffff"]}
locations={[0, 0.5, 1]}
start={{x:0.5, y:0}}
end={{x:0.5, y:1}} style={st.container}>
      <SafeAreaView style={st.safe}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[st.scroll,{paddingHorizontal:H_PAD}]}>

            {/* TOP BAR */}
            <View style={st.topBar}>
              <TouchableOpacity onPress={()=>router.back()} style={st.backBtn}><Text style={st.backText}>‹</Text></TouchableOpacity>
              <View style={{flex:1}}>
                <Text style={st.pageTitle}>Client Nutrition</Text>
                <Text style={st.pageSub}>Manage favourites & shopping</Text>
              </View>
            </View>

            {/* ─── SELECTED CLIENT CHIP ─── */}
            {selected && (
              <TouchableOpacity style={st.clientChip} onPress={()=>setShowList(v=>!v)} activeOpacity={0.88}>
                <View style={st.chipAvatarWrap}>
                  {avatarUri(selected)
                    ? <Image source={{uri:avatarUri(selected)!}} style={st.chipAvatar}/>
                    : <View style={st.chipAvatarFallback}><Text style={st.chipAvatarText}>{initials(selected)}</Text></View>
                  }
                </View>
                <View style={{flex:1}}>
                  <Text style={st.chipName}>{selected.firstName} {selected.lastName}</Text>
                  <Text style={st.chipEmail} numberOfLines={1}>{selected.email}</Text>
                </View>
                {showList
                  ? <ChevronUp size={18} color="rgba(255,255,255,0.6)"/>
                  : <ChevronDown size={18} color="rgba(255,255,255,0.6)"/>
                }
              </TouchableOpacity>
            )}

            {/* ─── CLIENT LIST ─── */}
            {showList && (
              <View style={st.clientSection}>
                {!selected && <Text style={st.sectionTitleWhite}>Select a Client</Text>}

                <View style={st.searchBar}>
                  <Search size={15} color="rgba(255,255,255,0.4)"/>
                  <TextInput style={st.searchInput} placeholder="Search by name or email…" placeholderTextColor="rgba(255,255,255,0.35)" value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none"/>
                  {search.length>0 && <TouchableOpacity onPress={()=>setSearch("")}><X size={14} color="rgba(255,255,255,0.5)"/></TouchableOpacity>}
                </View>

                {clientsLoading ? (
                  <View style={st.centerPad}><ActivityIndicator color="#fff"/></View>
                ) : filtered.length===0 ? (
                  <View style={st.emptyBoxDark}><Text style={{fontSize:36,marginBottom:6}}>👥</Text><Text style={st.emptyTextWhite}>No clients found</Text></View>
                ) : filtered.map(client => (
                  <TouchableOpacity key={client._id} style={[st.clientRow,selected?._id===client._id&&st.clientRowActive]} onPress={()=>selectClient(client)} activeOpacity={0.82}>
                    <View style={st.clientAvatarWrap}>
                      {avatarUri(client)
                        ? <Image source={{uri:avatarUri(client)!}} style={st.clientAvatar}/>
                        : <View style={st.clientAvatarFallback}><Text style={st.clientAvatarText}>{initials(client)}</Text></View>
                      }
                    </View>
                    <View style={{flex:1}}>
                      <Text style={st.clientName}>{client.firstName} {client.lastName}</Text>
                      <Text style={st.clientEmail} numberOfLines={1}>{client.email}</Text>
                    </View>
                    <Text style={st.clientArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ─── CONTENT after client selected ─── */}
            {selected && !showList && (
              <>
                {/* Section toggle pills */}
                <View style={st.sectionPills}>
                  <TouchableOpacity style={[st.pill, section==="favorites"&&st.pillActive]} onPress={()=>setSection("favorites")} activeOpacity={0.8}>
                    <Heart size={14} color={section==="favorites"?"#111":"rgba(255,255,255,0.6)"} fill={section==="favorites"?"#111":"none"}/>
                    <Text style={[st.pillText, section==="favorites"&&st.pillTextActive]}>Favourites</Text>
                    {favoriteMeals.length>0 && <View style={[st.pillBadge,section==="favorites"&&st.pillBadgeActive]}><Text style={[st.pillBadgeText,section==="favorites"&&{color:"#111"}]}>{favoriteMeals.length}</Text></View>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.pill, section==="shopping"&&st.pillActive]} onPress={()=>setSection("shopping")} activeOpacity={0.8}>
                    <ShoppingCart size={14} color={section==="shopping"?"#111":"rgba(255,255,255,0.6)"}/>
                    <Text style={[st.pillText, section==="shopping"&&st.pillTextActive]}>Shopping</Text>
                    {shopping.length>0 && <View style={[st.pillBadge,section==="shopping"&&st.pillBadgeActive]}><Text style={[st.pillBadgeText,section==="shopping"&&{color:"#111"}]}>{shopping.length}</Text></View>}
                  </TouchableOpacity>
                </View>

                {/* ══ FAVOURITES ══ */}
                {section==="favorites" && (
                  <>
                    <View style={st.contentHeader}>
                      <View>
                        <Text style={st.contentTitle}>Favourite Meals</Text>
                        <Text style={st.contentSub}>{selected.firstName}'s saved meals · {favoriteMeals.length} total</Text>
                      </View>
                      <TouchableOpacity style={st.addBtn} onPress={()=>setShowAddFav(true)} activeOpacity={0.85}>
                        <Plus size={15} color="#fff"/><Text style={st.addBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>

                    {loadingFavorites ? (
                      <View style={st.centerPad}><ActivityIndicator color="#fff"/></View>
                    ) : favoriteMeals.length===0 ? (
                      <View style={st.emptyBoxDark}>
                        <Text style={{fontSize:40,marginBottom:6}}>❤️</Text>
                        <Text style={st.emptyTextWhite}>No favourite meals saved</Text>
                        <TouchableOpacity onPress={()=>setShowAddFav(true)} style={st.emptyAction}><Text style={st.emptyActionText}>+ Add a favourite</Text></TouchableOpacity>
                      </View>
                    ) : (
                      <View style={st.favGrid}>
                        {favoriteMeals.map((meal,i) => (
                          <View key={i} style={st.favCard}>
                            <View style={st.favCardBody}>
                              <Heart size={16} color="#ef4444" fill="#ef4444" style={{marginBottom:6}}/>
                              <Text style={st.favName} numberOfLines={3}>{meal}</Text>
                            </View>
                            <View style={st.favCardActions}>
                              <TouchableOpacity style={st.favActionBtn} onPress={()=>{setEditFavOld(meal);setEditFavNew(meal);}}>
                                <Edit2 size={12} color="#888"/>
                              </TouchableOpacity>
                              <View style={{height:1,backgroundColor:"#f0f0f0"}}/>
                              <TouchableOpacity style={st.favActionBtn} onPress={()=>deleteFav(meal)}>
                                <Trash2 size={12} color="#ef4444"/>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* ══ SHOPPING ══ */}
                {section==="shopping" && (
                  <>
                    <View style={st.contentHeader}>
                      <View>
                        <Text style={st.contentTitle}>Shopping List</Text>
                        <Text style={st.contentSub}>{selected.firstName}'s purchases · {shopping.length} items</Text>
                      </View>
                      <TouchableOpacity style={st.addBtn} onPress={openAddShop} activeOpacity={0.85}>
                        <Plus size={15} color="#fff"/><Text style={st.addBtnText}>Add Item</Text>
                      </TouchableOpacity>
                    </View>

                    {loadingShopping ? (
                      <View style={st.centerPad}><ActivityIndicator color="#fff"/></View>
                    ) : shopping.length===0 ? (
                      <View style={st.emptyBoxDark}>
                        <Text style={{fontSize:40,marginBottom:6}}>🛒</Text>
                        <Text style={st.emptyTextWhite}>No shopping items yet</Text>
                        <TouchableOpacity onPress={openAddShop} style={st.emptyAction}><Text style={st.emptyActionText}>+ Add an item</Text></TouchableOpacity>
                      </View>
                    ) : sortedDates.map(date => (
                      <View key={date} style={{marginBottom:18}}>
                        <View style={st.dateHeader}>
                          <View style={st.dateDot}/>
                          <Text style={st.dateHeaderText}>{date===TODAY_ISO?"Today":new Date(date+"T00:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</Text>
                          {shopByDate[date].some(i=>i.price!=null) && (
                            <Text style={st.dateTotal}>${shopByDate[date].reduce((s,i)=>s+(i.price??0),0).toFixed(2)}</Text>
                          )}
                        </View>
                        {shopByDate[date].map(it => (
                          <View key={it._id} style={st.shopCard}>
                            <View style={st.shopCardLeft}>
                              <View style={st.shopIconWrap}><ShoppingCart size={14} color="#111"/></View>
                              <View style={{flex:1}}>
                                <Text style={st.shopItemName}>{it.item}</Text>
                                <View style={{flexDirection:"row",gap:10,marginTop:3}}>
                                  {it.quantity&&<Text style={st.shopMeta}>📦 {it.quantity}</Text>}
                                  {it.price!=null&&<Text style={st.shopMeta}>💰 ${it.price.toFixed(2)}</Text>}
                                </View>
                              </View>
                            </View>
                            <View style={{flexDirection:"row",gap:4}}>
                              <TouchableOpacity onPress={()=>openEditShop(it)} style={st.iconBtn}><Edit2 size={13} color="#888"/></TouchableOpacity>
                              <TouchableOpacity onPress={()=>deleteShop(it._id)} style={st.iconBtn}><Trash2 size={13} color="#ef4444"/></TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            <View style={{height:80}}/>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ══ ADD FAV MODAL ══ */}
      <Modal visible={showAddFav} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle}/>
            <View style={m.header}>
              <View>
                <Text style={m.title}>Add Favourite Meal</Text>
                {selected&&<Text style={m.subtitle}>For {selected.firstName} {selected.lastName}</Text>}
              </View>
              <TouchableOpacity onPress={()=>setShowAddFav(false)} style={m.closeBtn}><Text style={m.closeBtnText}>✕</Text></TouchableOpacity>
            </View>
            <Text style={m.label}>MEAL NAME *</Text>
            <TextInput style={m.input} placeholder="e.g. Grilled salmon with rice" placeholderTextColor="#bbb" value={newFav} onChangeText={setNewFav} autoFocus/>
            <TouchableOpacity style={[m.saveBtn,favSaving&&{opacity:0.55}]} onPress={addFav} disabled={favSaving} activeOpacity={0.88}>
              {favSaving?<ActivityIndicator color="#fff"/>:<Text style={m.saveBtnText}>Save Favourite</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowAddFav(false)} style={m.cancelBtn}><Text style={m.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ EDIT FAV MODAL ══ */}
      <Modal visible={!!editFavOld} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle}/>
            <View style={m.header}>
              <Text style={m.title}>Edit Favourite</Text>
              <TouchableOpacity onPress={()=>setEditFavOld(null)} style={m.closeBtn}><Text style={m.closeBtnText}>✕</Text></TouchableOpacity>
            </View>
            <Text style={m.label}>MEAL NAME *</Text>
            <TextInput style={m.input} value={editFavNew} onChangeText={setEditFavNew} autoFocus/>
            <TouchableOpacity style={[m.saveBtn,favSaving&&{opacity:0.55}]} onPress={editFav} disabled={favSaving} activeOpacity={0.88}>
              {favSaving?<ActivityIndicator color="#fff"/>:<Text style={m.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setEditFavOld(null)} style={m.cancelBtn}><Text style={m.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ SHOPPING MODAL ══ */}
      <Modal visible={showShopModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
          <View style={m.overlay}>
            <View style={m.sheet}>
              <View style={m.handle}/>
              <View style={m.header}>
                <View>
                  <Text style={m.title}>{editShopItem?"Edit Item":"Add Shopping Item"}</Text>
                  {selected&&<Text style={m.subtitle}>For {selected.firstName}</Text>}
                </View>
                <TouchableOpacity onPress={()=>setShowShopModal(false)} style={m.closeBtn}><Text style={m.closeBtnText}>✕</Text></TouchableOpacity>
              </View>
              <Text style={m.label}>ITEM NAME *</Text>
              <TextInput style={m.input} placeholder="e.g. Chicken breast" placeholderTextColor="#bbb" value={shopName} onChangeText={setShopName} autoFocus/>
              <View style={{flexDirection:"row",gap:10}}>
                <View style={{flex:1}}><Text style={m.label}>QUANTITY</Text><TextInput style={m.input} placeholder="e.g. 500g" placeholderTextColor="#bbb" value={shopQty} onChangeText={setShopQty}/></View>
                <View style={{flex:1}}><Text style={m.label}>PRICE ($)</Text><TextInput style={m.input} placeholder="0.00" placeholderTextColor="#bbb" value={shopPrice} onChangeText={setShopPrice} keyboardType="numeric"/></View>
              </View>
              <Text style={m.label}>DATE *</Text>
              <TextInput style={m.input} placeholder="YYYY-MM-DD" placeholderTextColor="#bbb" value={shopDate} onChangeText={setShopDate}/>
              <TouchableOpacity style={[m.saveBtn,shopSaving&&{opacity:0.55}]} onPress={saveShop} disabled={shopSaving} activeOpacity={0.88}>
                {shopSaving?<ActivityIndicator color="#fff"/>:<Text style={m.saveBtnText}>{editShopItem?"Save Changes":"Add Item"}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setShowShopModal(false)} style={m.cancelBtn}><Text style={m.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </LinearGradient>
  );
}

/* ─── palette ──────────────────────────────────────────────── */
const WHITE="#ffffff",BLACK="#111111",GRAY100="#f5f5f5",GRAY200="#e8e8e8",GRAY300="#e0e0e0",GRAY500="#888888";
const W15="rgba(255,255,255,0.15)",W25="rgba(255,255,255,0.25)",W60="rgba(255,255,255,0.60)";

/* ─── styles ───────────────────────────────────────────────── */
const st=StyleSheet.create({
  container:{flex:1}, safe:{flex:1},
  scroll:{paddingTop:12,paddingBottom:40},
  centerPad:{paddingVertical:32,alignItems:"center"},

  /* top bar */
  topBar:{flexDirection:"row",alignItems:"center",paddingTop:8,paddingBottom:18,gap:10},
  backBtn:{width:36,height:36,justifyContent:"center"},
  backText:{fontSize:30,color:WHITE,fontWeight:"300",lineHeight:36},
  pageTitle:{fontSize:24,fontWeight:"800",color:WHITE,letterSpacing:-0.5},
  pageSub:{fontSize:13,color:W60,marginTop:2},

  /* client chip */
  clientChip:{flexDirection:"row",alignItems:"center",backgroundColor:W15,borderRadius:16,padding:12,borderWidth:1,borderColor:W25,gap:12,marginBottom:14},
  chipAvatarWrap:{width:44,height:44,borderRadius:22,overflow:"hidden"},
  chipAvatar:{width:"100%",height:"100%"},
  chipAvatarFallback:{width:"100%",height:"100%",backgroundColor:"rgba(255,255,255,0.2)",justifyContent:"center",alignItems:"center"},
  chipAvatarText:{color:WHITE,fontWeight:"800",fontSize:16},
  chipName:{fontSize:15,fontWeight:"700",color:WHITE},
  chipEmail:{fontSize:12,color:W60,marginTop:2},

  /* client list */
  clientSection:{marginBottom:8},
  sectionTitleWhite:{fontSize:18,fontWeight:"800",color:WHITE,marginBottom:12},
  searchBar:{flexDirection:"row",alignItems:"center",backgroundColor:W15,borderRadius:14,paddingHorizontal:14,paddingVertical:12,marginBottom:10,borderWidth:1,borderColor:W25,gap:10},
  searchInput:{flex:1,fontSize:15,color:WHITE},
  clientRow:{flexDirection:"row",alignItems:"center",backgroundColor:W15,borderRadius:14,padding:14,borderWidth:1,borderColor:"transparent",gap:12,marginBottom:8},
  clientRowActive:{borderColor:W60,backgroundColor:W25},
  clientAvatarWrap:{width:46,height:46,borderRadius:23,overflow:"hidden"},
  clientAvatar:{width:"100%",height:"100%"},
  clientAvatarFallback:{width:"100%",height:"100%",backgroundColor:"rgba(255,255,255,0.2)",justifyContent:"center",alignItems:"center"},
  clientAvatarText:{color:WHITE,fontWeight:"800",fontSize:17},
  clientName:{fontSize:15,fontWeight:"700",color:WHITE},
  clientEmail:{fontSize:12,color:W60,marginTop:2},
  clientArrow:{fontSize:22,color:W60},

  /* section pills */
  sectionPills:{flexDirection:"row",gap:10,marginTop:14,marginBottom:18},
  pill:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:W15,borderRadius:20,paddingHorizontal:16,paddingVertical:9,borderWidth:1,borderColor:"transparent"},
  pillActive:{backgroundColor:WHITE},
  pillText:{fontSize:14,fontWeight:"600",color:W60},
  pillTextActive:{color:BLACK,fontWeight:"700"},
  pillBadge:{backgroundColor:W25,borderRadius:10,paddingHorizontal:7,paddingVertical:1,marginLeft:2},
  pillBadgeActive:{backgroundColor:"rgba(0,0,0,0.12)"},
  pillBadgeText:{fontSize:11,fontWeight:"700",color:WHITE},

  /* content header */
  contentHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14},
  contentTitle:{fontSize:18,fontWeight:"800",color:BLACK},
  contentSub:{fontSize:12,color:GRAY500,marginTop:2},
  addBtn:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:BLACK,paddingHorizontal:14,paddingVertical:8,borderRadius:20},
  addBtnText:{fontSize:13,fontWeight:"700",color:WHITE},

  /* favourites */
  favGrid:{flexDirection:"row",flexWrap:"wrap",gap:10},
  favCard:{backgroundColor:"rgba(255,255,255,0.93)",borderRadius:16,width:"48%",overflow:"hidden",flexDirection:"row",shadowColor:"#000",shadowOpacity:0.06,shadowRadius:8,elevation:2},
  favCardBody:{flex:1,padding:12},
  favName:{fontSize:13,fontWeight:"600",color:BLACK,lineHeight:19},
  favCardActions:{width:36,justifyContent:"center",borderLeftWidth:1,borderLeftColor:GRAY200},
  favActionBtn:{flex:1,justifyContent:"center",alignItems:"center"},

  /* shopping */
  dateHeader:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:10},
  dateDot:{width:8,height:8,borderRadius:4,backgroundColor:BLACK},
  dateHeaderText:{flex:1,fontSize:12,fontWeight:"800",color:BLACK,textTransform:"uppercase",letterSpacing:0.5},
  dateTotal:{fontSize:12,fontWeight:"700",color:BLACK},
  shopCard:{backgroundColor:"rgba(255,255,255,0.93)",borderRadius:14,padding:14,marginBottom:8,flexDirection:"row",alignItems:"center",shadowColor:"#000",shadowOpacity:0.05,shadowRadius:6,elevation:1},
  shopCardLeft:{flexDirection:"row",alignItems:"center",flex:1,gap:12},
  shopIconWrap:{width:34,height:34,borderRadius:17,backgroundColor:GRAY100,justifyContent:"center",alignItems:"center"},
  shopItemName:{fontSize:15,fontWeight:"700",color:BLACK},
  shopMeta:{fontSize:12,color:GRAY500},
  iconBtn:{width:34,height:34,borderRadius:17,backgroundColor:GRAY100,justifyContent:"center",alignItems:"center"},

  /* empty */
  emptyBoxDark:{backgroundColor:W15,borderRadius:16,padding:28,alignItems:"center",borderWidth:1,borderColor:W25,gap:6},
  emptyTextWhite:{fontSize:15,fontWeight:"700",color:WHITE},
  emptyAction:{marginTop:10,backgroundColor:WHITE,paddingHorizontal:16,paddingVertical:8,borderRadius:20},
  emptyActionText:{fontSize:13,fontWeight:"700",color:BLACK},
});

const m=StyleSheet.create({
  overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.55)",justifyContent:"flex-end"},
  sheet:{backgroundColor:WHITE,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingTop:12,maxHeight:SCREEN_H*0.82},
  handle:{width:40,height:4,borderRadius:2,backgroundColor:"#ddd",alignSelf:"center",marginBottom:16},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4},
  title:{fontSize:20,fontWeight:"800",color:BLACK},
  subtitle:{fontSize:13,color:GRAY500,marginTop:2,marginBottom:14},
  closeBtn:{width:34,height:34,borderRadius:17,backgroundColor:GRAY100,justifyContent:"center",alignItems:"center"},
  closeBtnText:{fontSize:14,fontWeight:"700",color:BLACK},
  label:{fontSize:10,fontWeight:"800",color:GRAY500,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8},
  input:{backgroundColor:GRAY100,color:BLACK,borderRadius:14,paddingHorizontal:16,paddingVertical:13,fontSize:15,borderWidth:1,borderColor:GRAY200,marginBottom:16},
  saveBtn:{backgroundColor:BLACK,paddingVertical:15,borderRadius:14,alignItems:"center",marginTop:4},
  saveBtnText:{color:WHITE,fontWeight:"800",fontSize:16},
  cancelBtn:{marginTop:12,marginBottom:8,alignItems:"center"},
  cancelText:{color:GRAY500,fontSize:14},
});